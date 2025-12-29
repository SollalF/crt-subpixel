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
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device: root.device,
    format: canvasFormat,
  });

  // Set canvas size to match texture
  canvas.width = result.width;
  canvas.height = result.height;

  // Create texture view for direct sampling (simpler than bind groups for blit)
  const renderView = result.texture.createView(d.texture2d(d.f32));

  // Create TypeGPU sampler
  const sampler = root["~unstable"].createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  // Create TypeGPU fragment function for blitting
  // Direct texture view access (simpler pattern from WebGPU samples)
  const renderFragment = tgpu["~unstable"].fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })((input) => {
    return std.textureSample(renderView.$, sampler.$, input.uv);
  });

  // Create TypeGPU render pipeline
  const renderPipeline = root["~unstable"]
    .withVertex(fullScreenTriangle, {})
    .withFragment(renderFragment, { format: canvasFormat })
    .createPipeline();

  // Render to canvas using TypeGPU's render pass API
  // No bind group needed when using direct texture views
  renderPipeline
    .withColorAttachment({
      view: context.getCurrentTexture().createView(),
      loadOp: "clear",
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      storeOp: "store",
    })
    .draw(3);
}
