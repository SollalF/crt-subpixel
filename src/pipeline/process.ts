/**
 * Image processing pipeline implementation using fragment shader
 */
import type { TgpuRoot, TgpuRenderPipeline } from "typegpu";
import * as d from "typegpu/data";
import { imageBindGroupLayout } from "../shaders/subpixel-fragment.js";

/**
 * Process an image through the subpixel pipeline using fragment shader
 * Renders directly to output texture using the same fragment shader approach as video
 */
export async function processImage(
  root: TgpuRoot,
  renderPipeline: TgpuRenderPipeline,
  inputImage: ImageBitmap,
) {
  const inputWidth = inputImage.width;
  const inputHeight = inputImage.height;

  console.log("Uploading image to texture", inputWidth, inputHeight);

  // Create sampled texture using TypeGPU
  // Format is hardcoded to "rgba8unorm" to match shader requirements
  // Needs render usage for write() to copy ImageBitmap data
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

  // Create output texture for render target
  // Format is hardcoded to "rgba8unorm" to match shader requirements
  // Needs both render (for writing) and sampled (for reading back to canvas)
  const outputTexture = root["~unstable"]
    .createTexture({
      size: [outputWidth, outputHeight],
      format: "rgba8unorm",
    })
    .$usage("render")
    .$usage("sampled"); // For render passes (e.g., canvas display)

  // Create texture view for rendering
  const outputView = outputTexture.createView(d.texture2d(d.f32));

  // Create bind group with input texture
  const bindGroup = root.createBindGroup(imageBindGroupLayout, {
    inputTexture: inputTexture,
  });

  // Render to output texture using fragment shader
  renderPipeline
    .with(bindGroup)
    .withColorAttachment({
      view: outputView,
      loadOp: "clear",
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      storeOp: "store",
    })
    .draw(3);

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
