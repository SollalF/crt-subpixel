/**
 * Render Pipeline Repository Interface
 * Defines the contract for rendering operations required by use cases
 */
import type { IGpuContext } from "./IGpuContext.js";

/**
 * Interface for render pipeline operations
 * Use cases depend on this abstraction, not concrete implementations
 */
export interface IRenderPipeline {
  /** Check if pipeline is created */
  readonly isCreated: boolean;

  /** Get the bind group layout for external textures */
  readonly externalTextureLayout: unknown;

  /** Create the render pipeline */
  create(gpuContext: IGpuContext): void;

  /** Render a frame using an external texture source */
  render(
    source: HTMLVideoElement | VideoFrame,
    textureView: GPUTextureView,
  ): void;

  /** Clean up pipeline resources */
  destroy(): void;
}
