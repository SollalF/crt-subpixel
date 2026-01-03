/**
 * Canvas Manager Repository Interface
 * Defines the contract for canvas operations required by use cases
 */
import { Dimensions } from "../value-objects/Dimensions.js";
import type { IGpuContext } from "./IGpuContext.js";

/**
 * Interface for canvas management operations
 * Use cases depend on this abstraction, not concrete implementations
 */
export interface ICanvasManager {
  /** Get the current canvas (if configured) */
  readonly currentCanvas: HTMLCanvasElement | null;

  /** Get the current WebGPU context (if configured) */
  readonly currentContext: GPUCanvasContext | null;

  /** Check if canvas is configured */
  readonly isConfigured: boolean;

  /** Configure canvas for WebGPU rendering */
  configure(canvas: HTMLCanvasElement, gpuContext: IGpuContext): void;

  /** Set canvas size to match input dimensions with 3x expansion */
  setSize(inputDimensions: Dimensions): Dimensions;

  /** Update canvas aspect ratio based on input dimensions */
  setAspectRatio(inputDimensions: Dimensions): void;

  /** Get the current texture view for rendering */
  getCurrentTextureView(): GPUTextureView;

  /** Export canvas content as a Blob */
  toBlob(type?: string, quality?: number): Promise<Blob | null>;

  /** Start a synchronous blob export (returns promise but starts immediately) */
  toBlobSync(type?: string, quality?: number): Promise<Blob | null>;

  /** Reset canvas manager state */
  reset(): void;
}
