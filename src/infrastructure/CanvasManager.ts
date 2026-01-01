/**
 * Canvas Manager
 * Handles WebGPU canvas context configuration and sizing
 */
import { Dimensions } from "../core/value-objects/Dimensions.js";
import type { ICanvasManager } from "../core/repositories/ICanvasManager.js";
import type { IGpuContext } from "../core/repositories/IGpuContext.js";

/**
 * Manages canvas configuration and WebGPU context
 */
export class CanvasManager implements ICanvasManager {
  private canvas: HTMLCanvasElement | null = null;
  private context: GPUCanvasContext | null = null;
  private gpuContext: IGpuContext | null = null;

  /**
   * Get the current canvas (if configured)
   */
  get currentCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  /**
   * Get the current WebGPU context (if configured)
   */
  get currentContext(): GPUCanvasContext | null {
    return this.context;
  }

  /**
   * Check if canvas is configured
   */
  get isConfigured(): boolean {
    return this.canvas !== null && this.context !== null;
  }

  /**
   * Configure canvas for WebGPU rendering
   * @param canvas The canvas element to configure
   * @param gpuContext The GPU context to use
   * @throws Error if WebGPU context cannot be obtained
   */
  configure(canvas: HTMLCanvasElement, gpuContext: IGpuContext): void {
    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new Error("Failed to get WebGPU context from canvas");
    }

    this.canvas = canvas;
    this.context = context;
    this.gpuContext = gpuContext;

    context.configure({
      device: gpuContext.device,
      format: gpuContext.presentationFormat,
      alphaMode: "premultiplied",
    });
  }

  /**
   * Set canvas size to match input dimensions with 3x expansion
   * @param inputDimensions The input image/video dimensions
   * @returns The resulting canvas dimensions
   */
  setSize(inputDimensions: Dimensions): Dimensions {
    if (!this.canvas) {
      throw new Error("Canvas not configured");
    }

    const canvasWidth = Math.floor(inputDimensions.width * 3);
    const canvasHeight = Math.floor(inputDimensions.height * 3);

    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;

    return new Dimensions(canvasWidth, canvasHeight);
  }

  /**
   * Update canvas aspect ratio based on input dimensions
   */
  setAspectRatio(inputDimensions: Dimensions): void {
    if (!this.canvas) {
      throw new Error("Canvas not configured");
    }

    const aspectRatio = inputDimensions.width / inputDimensions.height;
    this.canvas.style.aspectRatio = `${aspectRatio}`;
  }

  /**
   * Get the current texture view for rendering
   * @throws Error if canvas is not configured
   */
  getCurrentTextureView(): GPUTextureView {
    if (!this.context) {
      throw new Error("Canvas not configured");
    }
    return this.context.getCurrentTexture().createView();
  }

  /**
   * Export canvas content as a Blob
   * @param type Image MIME type
   * @param quality Image quality (for lossy formats)
   */
  async toBlob(
    type: string = "image/png",
    quality?: number,
  ): Promise<Blob | null> {
    if (!this.canvas) {
      return null;
    }

    return new Promise((resolve) => {
      this.canvas!.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  /**
   * Start a synchronous blob export (returns promise but starts immediately)
   * This is important for WebGPU where the backbuffer may be invalidated
   */
  toBlobSync(
    type: string = "image/png",
    quality?: number,
  ): Promise<Blob | null> {
    if (!this.canvas) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      this.canvas!.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  /**
   * Reset canvas manager state
   */
  reset(): void {
    this.canvas = null;
    this.context = null;
    this.gpuContext = null;
  }
}
