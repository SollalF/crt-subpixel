/**
 * Image processing pipeline implementation
 */

import type { ImageInput } from "../types.js";
import { WORKGROUP_SIZE } from "../shaders/subpixel.js";
import type {
  TgpuBindGroupLayout,
  TgpuRoot,
  TgpuComputePipeline,
} from "typegpu";

/**
 * Process an image through the subpixel pipeline
 */
export async function processImage(
  root: TgpuRoot,
  bindGroupLayout: TgpuBindGroupLayout,
  computePipeline: TgpuComputePipeline,
  inputImage: ImageInput,
  format: GPUTextureFormat,
): Promise<{ texture: GPUTexture; width: number; height: number }> {
  const inputWidth = inputImage.width;
  const inputHeight = inputImage.height;

  console.log("Uploading image to texture", inputWidth, inputHeight);

  // Create sampled texture directly using WebGPU API
  // This avoids TypeGPU wrapper issues and gives us direct access to the texture
  const inputTexture = root.device.createTexture({
    size: [inputWidth, inputHeight],
    format,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  // Convert ImageBitmap to ImageData and upload to texture
  const canvas = new OffscreenCanvas(inputWidth, inputHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to acquire 2D context");
  }
  ctx.drawImage(inputImage, 0, 0);
  const imageData = ctx.getImageData(0, 0, inputWidth, inputHeight);

  // Write image data directly to the texture
  root.device.queue.writeTexture(
    { texture: inputTexture },
    imageData.data,
    { bytesPerRow: inputWidth * 4, rowsPerImage: inputHeight },
    { width: inputWidth, height: inputHeight },
  );
  await root.device.queue.onSubmittedWorkDone();

  // Debug: Log first pixel from the ImageData we just created
  console.log(
    `Input texture first pixel RGBA: ${imageData.data[0]}, ${imageData.data[1]}, ${imageData.data[2]}, ${imageData.data[3]}`,
  );

  // Calculate output dimensions (3x expansion)
  const outputWidth = inputWidth * 3;
  const outputHeight = inputHeight * 3;

  // Create output texture
  // Include TEXTURE_BINDING so it can be sampled in render passes (e.g., for canvas display)
  const outputTexture = root.device.createTexture({
    size: [outputWidth, outputHeight],
    format,
    usage:
      GPUTextureUsage.STORAGE_BINDING |
      GPUTextureUsage.COPY_SRC |
      GPUTextureUsage.TEXTURE_BINDING,
    mipLevelCount: 1,
  });

  // Create TypeGPU bind group
  // Use the GPUTexture view directly
  const bindGroup = root.createBindGroup(bindGroupLayout, {
    inputTexture: inputTexture.createView(),
    outputTexture: outputTexture.createView(),
  });

  // Dispatch compute shader using TypeGPU pipeline API
  // Workgroup size is 8x8, so we need to dispatch enough workgroups
  const [workgroupSizeX, workgroupSizeY] = WORKGROUP_SIZE;
  const dispatchX = Math.ceil(outputWidth / workgroupSizeX);
  const dispatchY = Math.ceil(outputHeight / workgroupSizeY);

  // Dispatch compute shader - TypeGPU handles command encoding and submission
  computePipeline.with(bindGroup).dispatchWorkgroups(dispatchX, dispatchY);

  // Wait for GPU to finish processing before returning
  await root.device.queue.onSubmittedWorkDone();

  // Clean up input texture (output texture is returned)
  // Note: inputTexture is a GPUTexture, not a TypeGPU texture, so we use destroy() directly
  inputTexture.destroy();

  return {
    texture: outputTexture,
    width: outputWidth,
    height: outputHeight,
  };
}
