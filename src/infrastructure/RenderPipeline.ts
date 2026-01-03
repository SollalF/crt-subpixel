/**
 * Render Pipeline
 * Handles WebGPU pipeline creation and rendering
 */
import type { TgpuRenderPipeline } from "typegpu";
import { fullScreenTriangle } from "typegpu/common";

import {
  createSubpixelFragment,
  bindGroupLayout,
} from "./shaders/subpixel-fragment.js";
import type { IRenderPipeline } from "../core/ports/IRenderPipeline.js";
import type { IGpuContext } from "../core/ports/IGpuContext.js";

/**
 * Manages the render pipeline for CRT subpixel effect
 */
export class RenderPipeline implements IRenderPipeline {
  private pipeline: TgpuRenderPipeline | null = null;
  private gpuContext: IGpuContext | null = null;

  /**
   * Check if pipeline is created
   */
  get isCreated(): boolean {
    return this.pipeline !== null;
  }

  /**
   * Get the bind group layout for external textures
   */
  get externalTextureLayout(): unknown {
    return bindGroupLayout;
  }

  /**
   * Create the render pipeline
   * @param gpuContext The GPU context to use
   */
  create(gpuContext: IGpuContext): void {
    this.gpuContext = gpuContext;

    const fragmentFn = createSubpixelFragment(
      gpuContext.sampler,
      gpuContext.outputDimensionsBuffer,
      gpuContext.inputDimensionsBuffer,
      gpuContext.orientationBuffer,
      gpuContext.pixelDensityBuffer,
      gpuContext.interlacedBuffer,
      gpuContext.fieldBuffer,
    );

    this.pipeline = gpuContext.tgpuRoot["~unstable"]
      .withVertex(fullScreenTriangle, {})
      .withFragment(fragmentFn, { format: gpuContext.presentationFormat })
      .createPipeline();

    console.log("Render pipeline created successfully");
  }

  /**
   * Render a frame using an external texture source
   * @param source Video element or VideoFrame to render
   * @param textureView The target texture view
   */
  render(
    source: HTMLVideoElement | VideoFrame,
    textureView: GPUTextureView,
  ): void {
    if (!this.pipeline || !this.gpuContext) {
      throw new Error("Pipeline not created");
    }

    // Create bind group with external texture
    // Type assertion needed for bindGroupLayout compatibility
    const externalTexture = this.gpuContext.createBindGroup(
      bindGroupLayout as Parameters<typeof this.gpuContext.createBindGroup>[0],
      {
        externalTexture: this.gpuContext.device.importExternalTexture({
          source,
        }),
      },
    );

    // Render to target
    this.pipeline
      .with(externalTexture)
      .withColorAttachment({
        view: textureView,
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        storeOp: "store",
      })
      .draw(3);
  }

  /**
   * Clean up pipeline resources
   */
  destroy(): void {
    this.pipeline = null;
    this.gpuContext = null;
  }
}
