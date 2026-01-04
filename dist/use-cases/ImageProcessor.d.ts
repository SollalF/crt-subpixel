import { ExportOptions } from "../core/types.js";
import {
  IGpuContext,
  IRenderPipeline,
  ICanvasManager,
  ISettingsManager,
} from "../core/ports/index.js";
/**
 * Handles image processing operations
 */
export declare class ImageProcessor {
  private gpuContext;
  private pipeline;
  private canvasManager;
  private settingsManager;
  private readonly subpixelRenderer;
  constructor(
    gpuContext: IGpuContext,
    pipeline: IRenderPipeline,
    canvasManager: ICanvasManager,
    settingsManager: ISettingsManager,
  );
  /**
   * Render an image with CRT subpixel effect to the canvas
   * @param canvas Target canvas element
   * @param input ImageBitmap to process
   */
  render(canvas: HTMLCanvasElement, input: ImageBitmap): Promise<void>;
  /**
   * Export an image with CRT effect as a Blob
   * Re-renders the image to capture the result (WebGPU clears after present)
   * @param input ImageBitmap to process and export
   * @param options Export options (type, quality)
   */
  export(input: ImageBitmap, options?: ExportOptions): Promise<Blob | null>;
}
//# sourceMappingURL=ImageProcessor.d.ts.map
