/**
 * Image processing pipeline implementation
 */

import type { ImageInput } from "../types.js";
import {
  WORKGROUP_SIZE,
  subpixelBindGroupLayout,
} from "../shaders/subpixel.js";
import type { TgpuRoot, TgpuComputePipeline } from "typegpu";

/**
 * Process an image through the subpixel pipeline
 * Uses "rgba8unorm" format (hardcoded to match shader requirements)
 */
export async function processImage(
  root: TgpuRoot,
  computePipeline: TgpuComputePipeline,
  inputImage: ImageInput,
) {
  const inputWidth = inputImage.width;
  const inputHeight = inputImage.height;

  console.log("Uploading image to texture", inputWidth, inputHeight);

  // Create sampled texture using TypeGPU
  // Format is hardcoded to "rgba8unorm" to match shader requirements
  // Needs render usage for write() to copy ImageBitmap data (render includes copy destination)
  const inputTexture = root["~unstable"]
    .createTexture({
      size: [inputWidth, inputHeight],
      format: "rgba8unorm",
    })
    .$usage("sampled")
    .$usage("render");

  // Copy ImageBitmap directly to texture (no ImageData conversion needed!)
  inputTexture.write(inputImage);

  // Calculate output dimensions (3x expansion)
  const outputWidth = inputWidth * 3;
  const outputHeight = inputHeight * 3;

  // Create output texture with storage binding
  // Format is hardcoded to "rgba8unorm" to match shader requirements
  const outputTexture = root["~unstable"]
    .createTexture({
      size: [outputWidth, outputHeight],
      format: "rgba8unorm",
    })
    .$usage("storage", "sampled"); // For render passes (e.g., canvas display)

  // Create TypeGPU bind group
  // TypeGPU bind groups accept texture objects directly (not views)
  // Using the layout directly preserves type information for proper type inference
  const bindGroup = root.createBindGroup(subpixelBindGroupLayout, {
    inputTexture: inputTexture,
    outputTexture: outputTexture,
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
  inputTexture.destroy();

  return {
    texture: outputTexture,
    width: outputWidth,
    height: outputHeight,
  };
}
