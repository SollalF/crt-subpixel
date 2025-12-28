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

  // Copy ImageBitmap directly to texture (no ImageData conversion needed!)
  root.device.queue.copyExternalImageToTexture(
    { source: inputImage },
    { texture: inputTexture },
    { width: inputWidth, height: inputHeight },
  );
  await root.device.queue.onSubmittedWorkDone();

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
