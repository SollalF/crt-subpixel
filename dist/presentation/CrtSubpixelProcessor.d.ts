import { CameraOptions, Orientation } from "../core/types.js";
import { Orientation as OrientationVO } from "../core/value-objects/Orientation.js";
import {
  IGpuContext,
  IRenderPipeline,
  ICanvasManager,
  ICameraManager,
  ISettingsManager,
} from "../core/ports/index.js";
/**
 * Main processor class for CRT subpixel expansion
 *
 * Supports both static image processing and real-time camera input.
 * Both modes render directly to canvas and use canvas.toBlob() for export.
 *
 * @example
 * ```typescript
 * const processor = new CrtSubpixelProcessor();
 * await processor.init();
 *
 * // Static image processing
 * await processor.renderImage(canvas, imageBitmap);
 * const blob = await processor.exportImage(imageBitmap);
 *
 * // Camera mode
 * await processor.startCamera(canvas);
 * const frameBlob = await processor.exportCameraFrame();
 * processor.stopCamera();
 *
 * processor.destroy();
 * ```
 */
export declare class CrtSubpixelProcessor {
  private gpuContext;
  private pipeline;
  private canvasManager;
  private cameraManager;
  private settingsManager;
  private imageProcessor;
  private cameraProcessor;
  private currentImageBitmap;
  constructor(
    gpuContext?: IGpuContext,
    pipeline?: IRenderPipeline,
    canvasManager?: ICanvasManager,
    cameraManager?: ICameraManager,
    settingsManager?: ISettingsManager,
  );
  /**
   * Check if processor is initialized
   */
  get initialized(): boolean;
  /**
   * Initialize GPU device and compile shaders
   * Must be called before processing any images or starting camera
   *
   * @throws Error if GPU is not supported or initialization fails
   */
  init(): Promise<void>;
  /**
   * Render an image with CRT subpixel effect directly to canvas
   *
   * @param canvas Target canvas element for rendering
   * @param input Image to process (ImageBitmap - JPEG/PNG formats)
   * @throws Error if not initialized or rendering fails
   */
  renderImage(canvas: HTMLCanvasElement, input: ImageBitmap): Promise<void>;
  /**
   * Export an image by re-running the render pipeline and capturing the result
   * This is needed because WebGPU clears the canvas after each frame is presented
   *
   * @param input The ImageBitmap to render and export
   * @param type Image MIME type (e.g., 'image/png', 'image/jpeg')
   * @param quality For lossy formats like JPEG, quality from 0 to 1
   * @returns Promise resolving to the image Blob, or null if export fails
   */
  exportImage(
    input: ImageBitmap,
    type?: string,
    quality?: number,
  ): Promise<Blob | null>;
  /**
   * Start camera and begin rendering CRT effect to canvas in real-time
   *
   * @param canvas Target canvas element for rendering
   * @param options Camera options (resolution, facing mode, etc.)
   * @throws Error if not initialized or camera access fails
   */
  startCamera(
    canvas: HTMLCanvasElement,
    options?: CameraOptions,
  ): Promise<void>;
  /**
   * Stop camera and clean up camera resources
   */
  stopCamera(): void;
  /**
   * Check if camera is currently running
   */
  isCameraRunning(): boolean;
  /**
   * Export the current camera frame as an image blob
   *
   * Only works in camera mode - captures after the next render.
   * For image mode, use exportImage() instead.
   *
   * @param type Image MIME type (e.g., 'image/png', 'image/jpeg')
   * @param quality For lossy formats like JPEG, quality from 0 to 1
   * @returns Promise resolving to the image Blob, or null if camera is not running
   */
  exportCameraFrame(type?: string, quality?: number): Promise<Blob | null>;
  /**
   * Get the current camera frame dimensions
   *
   * @returns Object with width and height properties, or null if camera is not running or not ready
   */
  getCameraDimensions(): {
    width: number;
    height: number;
  } | null;
  /**
   * Set the RGB stripe orientation
   *
   * @param mode 'columns' for vertical stripes, 'rows' for horizontal stripes, or Orientation value object
   */
  setOrientation(mode: Orientation | OrientationVO): void;
  /**
   * Get the current RGB stripe orientation
   */
  getOrientation(): OrientationVO;
  /**
   * Set the pixel density for chunky pixel effect
   *
   * @param density Number of input pixels to treat as one logical pixel (1 = normal, 2+ = chunkier)
   */
  setPixelDensity(density: number): void;
  /**
   * Get the current pixel density
   */
  getPixelDensity(): number;
  /**
   * Set interlaced rendering mode
   *
   * @param enabled true for interlaced (renders only every other scanline), false for progressive
   */
  setInterlaced(enabled: boolean): void;
  /**
   * Get the current interlaced mode
   */
  getInterlaced(): boolean;
  /**
   * Set field selection for interlaced rendering
   *
   * @param field 'odd' for odd scanlines, 'even' for even scanlines
   */
  setField(field: "odd" | "even"): void;
  /**
   * Get the current field selection
   */
  getField(): "odd" | "even";
  /**
   * Clean up all GPU resources
   * Call this when done with the processor to free GPU memory
   */
  destroy(): void;
}
//# sourceMappingURL=CrtSubpixelProcessor.d.ts.map
