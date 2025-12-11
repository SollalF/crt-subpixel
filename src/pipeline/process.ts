/**
 * Image processing pipeline implementation
 */

import { createTextureFromSource } from "webgpu-utils";
import type { ImageInput } from "../types.js";
import type { SubpixelPipeline } from "./subpixelPipeline.js";

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
  _queue: GPUQueue,
  image: ImageInput,
  format: GPUTextureFormat,
): Promise<{ texture: GPUTexture; width: number; height: number }> {
  const { width, height } = getImageDimensions(image);

  const texture = createTextureFromSource(device, image as unknown, {
    format,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    flipY: false,
  });

  return { texture, width, height };
}

/**
 * Process an image through the subpixel pipeline
 */
export async function processImage(
  device: GPUDevice,
  queue: GPUQueue,
  pipeline: SubpixelPipeline,
  shaderModule: GPUShaderModule,
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
  const bindGroup = device.createBindGroup({
    layout: pipeline.bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: inputTexture.createView(),
      },
      {
        binding: 1,
        resource: outputTexture.createView(),
      },
    ],
  });

  // Create command encoder and compute pass
  const encoder = device.createCommandEncoder();
  const computePass = encoder.beginComputePass();

  computePass.setPipeline(pipeline.computePipeline);
  computePass.setBindGroup(0, bindGroup);

  // Dispatch compute shader
  // Workgroup size is 8x8, so we need to dispatch enough workgroups
  const workgroupSizeX = 8;
  const workgroupSizeY = 8;
  const dispatchX = Math.ceil(outputWidth / workgroupSizeX);
  const dispatchY = Math.ceil(outputHeight / workgroupSizeY);

  computePass.dispatchWorkgroups(dispatchX, dispatchY);
  computePass.end();

  // Submit commands
  queue.submit([encoder.finish()]);

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
