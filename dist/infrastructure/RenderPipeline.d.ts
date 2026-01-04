import { IRenderPipeline } from "../core/ports/IRenderPipeline.js";
import { IGpuContext } from "../core/ports/IGpuContext.js";
/**
 * Manages the render pipeline for CRT subpixel effect
 */
export declare class RenderPipeline implements IRenderPipeline {
  private pipeline;
  private gpuContext;
  /**
   * Check if pipeline is created
   */
  get isCreated(): boolean;
  /**
   * Get the bind group layout for external textures
   */
  get externalTextureLayout(): unknown;
  /**
   * Create the render pipeline
   * @param gpuContext The GPU context to use
   */
  create(gpuContext: IGpuContext): void;
  /**
   * Render a frame using an external texture source
   * @param source Video element or VideoFrame to render
   * @param textureView The target texture view
   */
  render(
    source: HTMLVideoElement | VideoFrame,
    textureView: GPUTextureView,
  ): void;
  /**
   * Clean up pipeline resources
   */
  destroy(): void;
}
//# sourceMappingURL=RenderPipeline.d.ts.map
