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
import type { ProcessResult, ImageInput } from "./types.js";
import tgpu, {
  type TgpuBindGroupLayout,
  type TgpuRoot,
  type TgpuComputePipeline,
} from "typegpu";

// Type assertion helper - tgpu.init() returns ExperimentalTgpuRoot at runtime
// which extends WithBinding and has withCompute method
interface ExperimentalTgpuRoot extends TgpuRoot {
  withCompute(entryFn: unknown): { createPipeline: () => TgpuComputePipeline };
}

// Import compute function and bind group layout
import {
  subpixelBindGroupLayout,
  subpixelComputeFn,
} from "./shaders/subpixel.js";

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
  private format: GPUTextureFormat | null = null;
  private bindGroupLayout: TgpuBindGroupLayout | null = null;
  private computePipeline: TgpuComputePipeline | null = null;
  private initialized = false;

  /**
   * Initialize WebGPU device and compile shaders
   * Must be called before processing any images
   *
   * @param options Optional adapter configuration
   * @throws Error if WebGPU is not supported or initialization fails
   */
  async init(): Promise<void> {
    if (this.initialized) {
      console.log("Processor already initialized");
      return;
    }

    // Check browser support
    if (!navigator.gpu) {
      throw new Error(
        "WebGPU is not supported in this browser. Requires Chrome/Edge with WebGPU enabled.",
      );
    }

    this.root = await tgpu.init();
    this.format = "rgba8unorm";

    this.root.device.lost.then((info) => {
      console.error(`WebGPU device was lost: ${info.message}`);
    });

    console.log("WebGPU device initialized");

    // Create compute pipeline using TypeGPU
    // Note: tgpu.init() returns ExperimentalTgpuRoot which has withCompute method
    this.bindGroupLayout = subpixelBindGroupLayout;
    const experimentalRoot = this.root as unknown as ExperimentalTgpuRoot;
    this.computePipeline = experimentalRoot
      .withCompute(subpixelComputeFn)
      .createPipeline();

    console.log("Compute pipeline created successfully");

    this.initialized = true;
  }

  /**
   * Process an image and expand it into CRT subpixel pattern
   *
   * @param input Image to process (ImageBitmap, ImageData, HTMLImageElement, etc.)
   * @returns Result containing output texture and dimensions (3x input size)
   * @throws Error if not initialized or processing fails
   */
  async process(input: ImageInput): Promise<ProcessResult> {
    if (!this.initialized) {
      throw new Error(
        "Processor not initialized. Call init() before processing images.",
      );
    }

    const result = await processImage(
      this.root!,
      {
        bindGroupLayout: this.bindGroupLayout!,
        computePipeline: this.computePipeline!,
      },
      input,
      this.format!,
    );

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
   * Clean up GPU resources
   * Call this when done with the processor to free GPU memory
   */
  destroy(): void {
    // Note: GPUTexture objects returned from process() should be destroyed
    // by the caller when no longer needed
    this.root = null;
    this.format = null;
    this.bindGroupLayout = null;
    this.computePipeline = null;
    this.initialized = false;
  }
}

// Re-export types
export type { ProcessResult, AdapterOptions, ImageInput } from "./types.js";
