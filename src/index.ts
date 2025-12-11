/**
 * CRT Subpixel Processing Library
 *
 * A WebGPU-based library for expanding images into CRT-style subpixel patterns.
 * Each input pixel is expanded into a 3x3 block with vertical RGB stripes.
 *
 * Browser Support: Chrome/Edge desktop (requires secure context)
 */

import { initWebGPU, type WebGPUDevice } from "./core/device.js";
import { createSubpixelPipeline } from "./pipeline/subpixelPipeline.js";
import { processImage } from "./pipeline/process.js";
import {
  readTextureToImageData,
  readTextureToUint8Array,
} from "./utils/readback.js";
import type { ProcessResult, AdapterOptions, ImageInput } from "./types.js";

// Import shader source
import { subpixelShaderSource } from "./shaders/subpixel.js";

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
  private gpuDevice: WebGPUDevice | null = null;
  private shaderModule: GPUShaderModule | null = null;
  private pipeline: ReturnType<typeof createSubpixelPipeline> | null = null;
  private initialized = false;

  /**
   * Initialize WebGPU device and compile shaders
   * Must be called before processing any images
   *
   * @param options Optional adapter configuration
   * @throws Error if WebGPU is not supported or initialization fails
   */
  async init(options?: AdapterOptions): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.gpuDevice = await initWebGPU(options);
    const { device } = this.gpuDevice;

    // Compile shader
    this.shaderModule = device.createShaderModule({
      code: subpixelShaderSource,
    });

    // Create pipeline
    this.pipeline = createSubpixelPipeline(device, this.shaderModule);

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
    if (
      !this.initialized ||
      !this.gpuDevice ||
      !this.pipeline ||
      !this.shaderModule
    ) {
      throw new Error(
        "Processor not initialized. Call init() before processing images.",
      );
    }

    const { device, queue, format } = this.gpuDevice;

    const result = await processImage(
      device,
      queue,
      this.pipeline,
      this.shaderModule,
      input,
      format,
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
    if (!this.gpuDevice) {
      throw new Error("Processor not initialized");
    }

    const { device, queue } = this.gpuDevice;
    return readTextureToImageData(
      device,
      queue,
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
    if (!this.gpuDevice) {
      throw new Error("Processor not initialized");
    }

    const { device, queue } = this.gpuDevice;
    return readTextureToUint8Array(
      device,
      queue,
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
    this.gpuDevice = null;
    this.shaderModule = null;
    this.pipeline = null;
    this.initialized = false;
  }
}

// Re-export types
export type { ProcessResult, AdapterOptions, ImageInput } from "./types.js";
