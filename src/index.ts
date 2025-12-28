/**
 * CRT Subpixel Processing Library
 *
 * A WebGPU-based library for expanding images into CRT-style subpixel patterns.
 * Each input pixel is expanded into a 3x3 block with vertical RGB stripes.
 *
 * Browser Support: Chrome/Edge desktop (requires secure context)
 */

import { processImage } from "./pipeline/process.js";
import {
  readTextureToImageData,
  readTextureToUint8Array,
} from "./utils/readback.js";
import type { ProcessResult } from "./types.js";
import tgpu, { type TgpuRoot, type TgpuComputePipeline } from "typegpu";
import * as d from "typegpu/data";
import * as std from "typegpu/std";
import { fullScreenTriangle } from "typegpu/common";

// Import compute function and bind group layout
import { subpixelComputeFn } from "./shaders/subpixel.js";

/**
 * Main processor class for CRT subpixel expansion
 *
 * @example
 * ```typescript
 * const processor = new CrtSubpixelProcessor();
 * await processor.init();
 *
 * const result = await processor.process(imageBitmap);
 * const imageData = await processor.readbackImageData(result);
 * ```
 */
export class CrtSubpixelProcessor {
  private root: TgpuRoot | null = null;
  private computePipeline: TgpuComputePipeline | null = null;
  private initialized = false;

  /**
   * Initialize GPU device and compile shaders
   * Must be called before processing any images
   *
   * @throws Error if GPU is not supported or initialization fails
   */
  async init(): Promise<void> {
    if (this.initialized) {
      console.log("Processor already initialized");
      return;
    }

    // TypeGPU handles WebGPU initialization and error checking
    this.root = await tgpu.init();

    // Handle device loss through TypeGPU's device access
    this.root.device.lost.then((info) => {
      console.error(`GPU device was lost: ${info.message}`);
    });

    console.log("GPU device initialized");

    // Create compute pipeline using TypeGPU
    // Use the '~unstable' API which is properly typed and includes withCompute
    this.computePipeline = this.root["~unstable"]
      .withCompute(subpixelComputeFn)
      .createPipeline();

    console.log("Compute pipeline created successfully");

    this.initialized = true;
  }

  /**
   * Process an image and expand it into CRT subpixel pattern
   *
   * @param input Image to process (ImageBitmap - JPEG/PNG formats)
   * @returns Result containing output texture and dimensions (3x input size)
   * @throws Error if not initialized or processing fails
   */
  async process(input: ImageBitmap): Promise<ProcessResult> {
    if (!this.initialized) {
      throw new Error(
        "Processor not initialized. Call init() before processing images.",
      );
    }

    const result = await processImage(this.root!, this.computePipeline!, input);

    return {
      texture: result.texture,
      width: result.width,
      height: result.height,
    };
  }

  /**
   * Read back a processed texture to ImageData
   *
   * @param result Process result from process()
   * @returns ImageData containing the subpixel-expanded image
   */
  async readbackImageData(result: ProcessResult): Promise<ImageData> {
    if (!this.initialized) {
      throw new Error("Processor not initialized");
    }

    return readTextureToImageData(
      this.root!,
      result.texture,
      result.width,
      result.height,
    );
  }

  /**
   * Read back a processed texture to Uint8ClampedArray
   *
   * @param result Process result from process()
   * @returns Uint8ClampedArray containing raw pixel data (RGBA)
   */
  async readbackUint8Array(result: ProcessResult): Promise<Uint8ClampedArray> {
    if (!this.initialized) {
      throw new Error("Processor not initialized");
    }

    return readTextureToUint8Array(
      this.root!,
      result.texture,
      result.width,
      result.height,
    );
  }

  /**
   * Render a processed texture directly to a canvas
   * This avoids the need for CPU readback and is much faster
   *
   * @param canvas HTMLCanvasElement with WebGPU context
   * @param result Process result from process()
   * @throws Error if not initialized or canvas context is invalid
   */
  async renderToCanvas(
    canvas: HTMLCanvasElement,
    result: ProcessResult,
  ): Promise<void> {
    if (!this.initialized) {
      throw new Error("Processor not initialized");
    }

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
      device: this.root!.device,
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
    const sampler = this.root!["~unstable"].createSampler({
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
    const renderPipeline = this.root!["~unstable"].withVertex(
      fullScreenTriangle,
      {},
    )
      .withFragment(blitFragment, { format: canvasFormat })
      .createPipeline();

    // Create TypeGPU bind group (textures work directly!)
    const blitBindGroup = this.root!.createBindGroup(blitLayout, {
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

  /**
   * Clean up GPU resources
   * Call this when done with the processor to free GPU memory
   */
  destroy(): void {
    // Note: Texture objects returned from process() should be destroyed
    // by the caller when no longer needed
    this.root = null;
    this.computePipeline = null;
    this.initialized = false;
  }
}

// Re-export types
export type { ProcessResult } from "./types.js";
