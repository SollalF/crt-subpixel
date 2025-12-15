/**
 * Image processing pipeline implementation
 */

import type { ImageInput } from "../types.js";
import { WORKGROUP_SIZE } from "../shaders/subpixel.js";
import type { TgpuBindGroupLayout, TgpuRoot } from "typegpu";

type SubpixelPipeline = {
  bindGroupLayout: TgpuBindGroupLayout;
  computePipeline: GPUComputePipeline;
};

function getImageDimensions(image: ImageInput): {
  width: number;
  height: number;
} {
  if (image instanceof ImageBitmap) {
    return { width: image.width, height: image.height };
  }
  if (image instanceof ImageData) {
    return { width: image.width, height: image.height };
  }
  if (image instanceof HTMLImageElement) {
    return {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    };
  }
  if (image instanceof HTMLCanvasElement || image instanceof OffscreenCanvas) {
    return { width: image.width, height: image.height };
  }

  throw new Error(
    "Unsupported image input type. Expected bitmap, data, or canvas.",
  );
}

/**
 * Upload an image to a GPU texture
 */
export async function uploadImageToTexture(
  device: GPUDevice,
  queue: GPUQueue,
  image: ImageInput,
  format: GPUTextureFormat,
): Promise<{ texture: GPUTexture; width: number; height: number }> {
  const { width, height } = getImageDimensions(image);

  // Draw into a canvas to guarantee predictable RGBA8 bytes, then upload via writeTexture.
  const offscreen =
    image instanceof OffscreenCanvas
      ? image
      : new OffscreenCanvas(width, height);

  const ctx = offscreen.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to acquire 2D context for upload");
  }

  if (!(image instanceof OffscreenCanvas)) {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image as CanvasImageSource, 0, 0, width, height);
  }

  const imageData = ctx.getImageData(0, 0, width, height);

  console.log("imageData", imageData);

  const texture = device.createTexture({
    size: [width, height],
    format,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  console.log("texture", texture);

  queue.writeTexture(
    { texture },
    imageData.data,
    {
      bytesPerRow: width * 4,
      rowsPerImage: height,
    },
    { width, height, depthOrArrayLayers: 1 },
  );

  // Ensure the copy completes before the texture is consumed.
  await queue.onSubmittedWorkDone();

  return { texture, width, height };
}

/**
 * Process an image through the subpixel pipeline
 */
export async function processImage(
  root: TgpuRoot,
  device: GPUDevice,
  queue: GPUQueue,
  pipeline: SubpixelPipeline,
  inputImage: ImageInput,
  format: GPUTextureFormat,
): Promise<{ texture: GPUTexture; width: number; height: number }> {
  // Upload input image
  const {
    texture: inputTexture,
    width: inputWidth,
    height: inputHeight,
  } = await uploadImageToTexture(device, queue, inputImage, format);

  // Calculate output dimensions (3x expansion)
  const outputWidth = inputWidth * 3;
  const outputHeight = inputHeight * 3;

  // Create output texture
  const outputTexture = device.createTexture({
    size: [outputWidth, outputHeight],
    format,
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
    mipLevelCount: 1,
  });

  // Create bind group
  const bindGroup = root.device.createBindGroup({
    layout: root.unwrap(pipeline.bindGroupLayout),
    entries: [
      { binding: 0, resource: inputTexture.createView() },
      { binding: 1, resource: outputTexture.createView() },
    ],
  });

  // Create command encoder and compute pass
  const encoder = device.createCommandEncoder();
  const computePass = encoder.beginComputePass();

  computePass.setPipeline(pipeline.computePipeline);
  computePass.setBindGroup(0, bindGroup);

  // Dispatch compute shader
  // Workgroup size is 8x8, so we need to dispatch enough workgroups
  const [workgroupSizeX, workgroupSizeY] = WORKGROUP_SIZE;
  const dispatchX = Math.ceil(outputWidth / workgroupSizeX);
  const dispatchY = Math.ceil(outputHeight / workgroupSizeY);

  computePass.dispatchWorkgroups(dispatchX, dispatchY);
  computePass.end();

  // Submit commands with validation error scope to surface issues
  device.pushErrorScope("validation");
  queue.submit([encoder.finish()]);
  const validationError = await device.popErrorScope();
  if (validationError) {
    throw new Error(`GPU validation error: ${validationError.message}`);
  }

  // Wait for GPU to finish processing before returning
  await queue.onSubmittedWorkDone();

  // Clean up input texture (output texture is returned)
  inputTexture.destroy();

  return {
    texture: outputTexture,
    width: outputWidth,
    height: outputHeight,
  };
}
