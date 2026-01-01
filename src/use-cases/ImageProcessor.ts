/**
 * Image Processor Use Case
 * Orchestrates image rendering and export with CRT subpixel effect
 */
import type { Dimensions, ExportOptions } from "../core/types.js";
import type { IGpuContext } from "./ports/IGpuContext.js";
import type { IRenderPipeline } from "./ports/IRenderPipeline.js";
import type { ICanvasManager } from "./ports/ICanvasManager.js";
import type { ISettingsManager } from "./ports/ISettingsManager.js";

/**
 * Handles image processing operations
 */
export class ImageProcessor {
  constructor(
    private gpuContext: IGpuContext,
    private pipeline: IRenderPipeline,
    private canvasManager: ICanvasManager,
    private settingsManager: ISettingsManager,
  ) {}

  /**
   * Calculate output dimensions based on input and pixel density
   */
  private calculateOutputDimensions(input: Dimensions): Dimensions {
    const density = this.settingsManager.pixelDensity;
    const logicalWidth = input.width / density;
    const logicalHeight = input.height / density;

    return {
      width: Math.floor(logicalWidth * 3),
      height: Math.floor(logicalHeight * 3),
    };
  }

  /**
   * Render an image with CRT subpixel effect to the canvas
   * @param canvas Target canvas element
   * @param input ImageBitmap to process
   */
  async render(canvas: HTMLCanvasElement, input: ImageBitmap): Promise<void> {
    if (!this.gpuContext.initialized || !this.pipeline.isCreated) {
      throw new Error("Processor not initialized");
    }

    // Configure canvas
    this.canvasManager.configure(canvas, this.gpuContext);

    // Set canvas size (3x input for full detail)
    this.canvasManager.setSize({ width: input.width, height: input.height });

    // Update input dimensions
    this.gpuContext.writeInputDimensions({
      width: input.width,
      height: input.height,
    });

    // Calculate and update output dimensions
    const outputDimensions = this.calculateOutputDimensions({
      width: input.width,
      height: input.height,
    });
    this.gpuContext.writeOutputDimensions(outputDimensions);

    // Convert ImageBitmap to VideoFrame for external texture
    const videoFrame = new VideoFrame(input, { timestamp: 0 });

    try {
      // Render
      this.pipeline.render(
        videoFrame,
        this.canvasManager.getCurrentTextureView(),
      );

      // Wait for GPU to finish
      await this.gpuContext.flush();

      // Update aspect ratio
      this.canvasManager.setAspectRatio({
        width: input.width,
        height: input.height,
      });

      const canvasSize = this.canvasManager.currentCanvas;
      console.log(
        `Image rendered: ${canvasSize?.width}x${canvasSize?.height}, logical pixels ${outputDimensions.width}x${outputDimensions.height}`,
      );
    } finally {
      // Clean up VideoFrame
      videoFrame.close();
    }
  }

  /**
   * Export an image with CRT effect as a Blob
   * Re-renders the image to capture the result (WebGPU clears after present)
   * @param input ImageBitmap to process and export
   * @param options Export options (type, quality)
   */
  async export(
    input: ImageBitmap,
    options: ExportOptions = {},
  ): Promise<Blob | null> {
    if (
      !this.gpuContext.initialized ||
      !this.pipeline.isCreated ||
      !this.canvasManager.isConfigured
    ) {
      console.warn(
        "Cannot export: processor not ready or no canvas configured",
      );
      return null;
    }

    const type = options.type ?? "image/png";
    const quality = options.quality;

    // Update dimensions
    this.gpuContext.writeInputDimensions({
      width: input.width,
      height: input.height,
    });

    const outputDimensions = this.calculateOutputDimensions({
      width: input.width,
      height: input.height,
    });
    this.gpuContext.writeOutputDimensions(outputDimensions);

    // Convert to VideoFrame
    const videoFrame = new VideoFrame(input, { timestamp: 0 });

    try {
      // Render
      this.pipeline.render(
        videoFrame,
        this.canvasManager.getCurrentTextureView(),
      );

      // CRITICAL: Call toBlob synchronously right after draw
      // This ensures canvas content is captured before frame is presented
      const blobPromise = this.canvasManager.toBlobSync(type, quality);

      // Wait for GPU completion
      await this.gpuContext.flush();

      return blobPromise;
    } finally {
      videoFrame.close();
    }
  }
}
