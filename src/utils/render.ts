/**
 * Utilities for rendering GPU textures to canvas
 */

import type { TgpuRoot } from "typegpu";
import type { ProcessResult } from "../types.js";
import tgpu from "typegpu";
import * as d from "typegpu/data";
import * as std from "typegpu/std";
import { fullScreenTriangle } from "typegpu/common";

/**
 * Render a processed texture directly to a canvas
 * This avoids the need for CPU readback and is much faster
 *
 * @param root TypeGPU root instance
 * @param canvas HTMLCanvasElement with WebGPU context
 * @param result Process result from process()
 * @throws Error if canvas context is invalid
 */
export async function renderTextureToCanvas(
  root: TgpuRoot,
  canvas: HTMLCanvasElement,
  result: ProcessResult,
): Promise<void> {
  // Get or configure canvas context (minimal WebGPU access required for canvas)
  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error(
      "Failed to get WebGPU context from canvas. Make sure the canvas supports WebGPU.",
    );
  }

  // Configure canvas to use the same device through TypeGPU root
  // Use default format (bgra8unorm is preferred on most platforms)
  const canvasFormat = "bgra8unorm";
  context.configure({
    device: root.device,
    format: canvasFormat,
  });

  // Set canvas size to match texture
  canvas.width = result.width;
  canvas.height = result.height;

  // Create TypeGPU bind group layout for blit shader
  const blitLayout = tgpu
    .bindGroupLayout({
      inputTexture: { texture: d.texture2d(d.f32) },
      inputSampler: { sampler: "filtering" },
    })
    .$idx(0);

  // Create TypeGPU sampler
  const sampler = root["~unstable"].createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  // Create TypeGPU fragment function for blitting
  const blitFragment = tgpu["~unstable"].fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })((input) => {
    return std.textureSample(blitLayout.$.inputTexture, sampler.$, input.uv);
  });

  // Create TypeGPU render pipeline
  const renderPipeline = root["~unstable"]
    .withVertex(fullScreenTriangle, {})
    .withFragment(blitFragment, { format: canvasFormat })
    .createPipeline();

  // Create TypeGPU bind group (textures work directly!)
  const blitBindGroup = root.createBindGroup(blitLayout, {
    inputTexture: result.texture,
    inputSampler: sampler,
  });

  // Render to canvas using TypeGPU's render pass API
  renderPipeline
    .withColorAttachment({
      view: context.getCurrentTexture().createView(),
      loadOp: "clear",
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      storeOp: "store",
    })
    .with(blitBindGroup)
    .draw(3);
}
