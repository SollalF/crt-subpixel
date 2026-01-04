import { Dimensions } from "../core/value-objects/Dimensions.js";
import { ICanvasManager } from "../core/ports/ICanvasManager.js";
import { IGpuContext } from "../core/ports/IGpuContext.js";
/**
 * Manages canvas configuration and WebGPU context
 */
export declare class CanvasManager implements ICanvasManager {
  private canvas;
  private context;
  /**
   * Get the current canvas (if configured)
   */
  get currentCanvas(): HTMLCanvasElement | null;
  /**
   * Get the current WebGPU context (if configured)
   */
  get currentContext(): GPUCanvasContext | null;
  /**
   * Check if canvas is configured
   */
  get isConfigured(): boolean;
  /**
   * Configure canvas for WebGPU rendering
   * @param canvas The canvas element to configure
   * @param gpuContext The GPU context to use
   * @throws Error if WebGPU context cannot be obtained
   */
  configure(canvas: HTMLCanvasElement, gpuContext: IGpuContext): void;
  /**
   * Set canvas size to match input dimensions with 3x expansion
   * @param inputDimensions The input image/video dimensions
   * @returns The resulting canvas dimensions
   */
  setSize(inputDimensions: Dimensions): Dimensions;
  /**
   * Update canvas aspect ratio based on input dimensions
   */
  setAspectRatio(inputDimensions: Dimensions): void;
  /**
   * Get the current texture view for rendering
   * @throws Error if canvas is not configured
   */
  getCurrentTextureView(): GPUTextureView;
  /**
   * Export canvas content as a Blob
   * @param type Image MIME type
   * @param quality Image quality (for lossy formats)
   */
  toBlob(type?: string, quality?: number): Promise<Blob | null>;
  /**
   * Start a synchronous blob export (returns promise but starts immediately)
   * This is important for WebGPU where the backbuffer may be invalidated
   */
  toBlobSync(type?: string, quality?: number): Promise<Blob | null>;
  /**
   * Reset canvas manager state
   */
  reset(): void;
}
//# sourceMappingURL=CanvasManager.d.ts.map
