/**
 * CRT Subpixel Processor
 *
 * A WebGPU-based library for expanding images into CRT-style subpixel patterns.
 * Each input pixel is expanded into a 3x3 block with vertical RGB stripes.
 *
 * Supports both static images and real-time camera input.
 * Both render directly to canvas and use canvas.toBlob() for export.
 *
 * Browser Support: Chrome/Edge desktop (requires secure context)
 */
import type { CameraOptions, Orientation } from "../core/types.js";
import { Orientation as OrientationVO } from "../core/value-objects/Orientation.js";
import type {
  IGpuContext,
  IRenderPipeline,
  ICanvasManager,
  ICameraManager,
  ISettingsManager,
} from "../core/ports/index.js";
import { GpuContext } from "../infrastructure/GpuContext.js";
import { RenderPipeline } from "../infrastructure/RenderPipeline.js";
import { CanvasManager } from "../infrastructure/CanvasManager.js";
import { CameraManager } from "../infrastructure/CameraManager.js";
import { SettingsManager } from "../infrastructure/SettingsManager.js";
import { ImageProcessor } from "../use-cases/ImageProcessor.js";
import { CameraProcessor } from "../use-cases/CameraProcessor.js";

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
export class CrtSubpixelProcessor {
  // Infrastructure components
  private gpuContext: IGpuContext;
  private pipeline: IRenderPipeline;
  private canvasManager: ICanvasManager;
  private cameraManager: ICameraManager;
  private settingsManager: ISettingsManager;

  // Use cases
  private imageProcessor: ImageProcessor | null = null;
  private cameraProcessor: CameraProcessor | null = null;

  // Track current image for re-rendering
  private currentImageBitmap: ImageBitmap | null = null;

  constructor(
    gpuContext?: IGpuContext,
    pipeline?: IRenderPipeline,
    canvasManager?: ICanvasManager,
    cameraManager?: ICameraManager,
    settingsManager?: ISettingsManager,
  ) {
    // Use provided dependencies or create default implementations
    this.gpuContext = gpuContext ?? new GpuContext();
    this.pipeline = pipeline ?? new RenderPipeline();
    this.canvasManager = canvasManager ?? new CanvasManager();
    this.cameraManager = cameraManager ?? new CameraManager();
    this.settingsManager = settingsManager ?? new SettingsManager();
  }

  /**
   * Check if processor is initialized
   */
  get initialized(): boolean {
    return this.gpuContext.initialized;
  }

  /**
   * Initialize GPU device and compile shaders
   * Must be called before processing any images or starting camera
   *
   * @throws Error if GPU is not supported or initialization fails
   */
  async init(): Promise<void> {
    if (this.initialized) {
      console.log("Processor already initialized");
      return;
    }

    // Initialize GPU context
    await this.gpuContext.init();

    // Connect settings to GPU
    this.settingsManager.connect(this.gpuContext);

    // Create pipeline
    this.pipeline.create(this.gpuContext);

    // Create use cases
    this.imageProcessor = new ImageProcessor(
      this.gpuContext,
      this.pipeline,
      this.canvasManager,
      this.settingsManager,
    );

    this.cameraProcessor = new CameraProcessor(
      this.gpuContext,
      this.pipeline,
      this.canvasManager,
      this.cameraManager,
      this.settingsManager,
    );

    console.log("CrtSubpixelProcessor initialized");
  }

  // ============================================
  // Image Rendering
  // ============================================

  /**
   * Render an image with CRT subpixel effect directly to canvas
   *
   * @param canvas Target canvas element for rendering
   * @param input Image to process (ImageBitmap - JPEG/PNG formats)
   * @throws Error if not initialized or rendering fails
   */
  async renderImage(
    canvas: HTMLCanvasElement,
    input: ImageBitmap,
  ): Promise<void> {
    if (!this.imageProcessor) {
      throw new Error(
        "Processor not initialized. Call init() before rendering images.",
      );
    }

    // Stop camera if running (switching to image mode)
    if (this.isCameraRunning()) {
      this.stopCamera();
    }

    // Store for potential re-render (e.g., orientation change)
    this.currentImageBitmap = input;

    await this.imageProcessor.render(canvas, input);
  }

  /**
   * Export an image by re-running the render pipeline and capturing the result
   * This is needed because WebGPU clears the canvas after each frame is presented
   *
   * @param input The ImageBitmap to render and export
   * @param type Image MIME type (e.g., 'image/png', 'image/jpeg')
   * @param quality For lossy formats like JPEG, quality from 0 to 1
   * @returns Promise resolving to the image Blob, or null if export fails
   */
  async exportImage(
    input: ImageBitmap,
    type: string = "image/png",
    quality?: number,
  ): Promise<Blob | null> {
    if (!this.imageProcessor) {
      console.warn("Processor not initialized");
      return null;
    }

    return this.imageProcessor.export(input, { type, quality });
  }

  // ============================================
  // Camera Processing
  // ============================================

  /**
   * Start camera and begin rendering CRT effect to canvas in real-time
   *
   * @param canvas Target canvas element for rendering
   * @param options Camera options (resolution, facing mode, etc.)
   * @throws Error if not initialized or camera access fails
   */
  async startCamera(
    canvas: HTMLCanvasElement,
    options?: CameraOptions,
  ): Promise<void> {
    if (!this.cameraProcessor) {
      throw new Error("Processor not initialized. Call init() first.");
    }

    await this.cameraProcessor.start(canvas, options);
  }

  /**
   * Stop camera and clean up camera resources
   */
  stopCamera(): void {
    this.cameraProcessor?.stop();
  }

  /**
   * Check if camera is currently running
   */
  isCameraRunning(): boolean {
    return this.cameraProcessor?.isRunning ?? false;
  }

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
  async exportCameraFrame(
    type: string = "image/png",
    quality?: number,
  ): Promise<Blob | null> {
    if (!this.cameraProcessor) {
      console.warn("Processor not initialized");
      return null;
    }

    return this.cameraProcessor.exportFrame({ type, quality });
  }

  // ============================================
  // Settings
  // ============================================

  /**
   * Set the RGB stripe orientation
   *
   * @param mode 'columns' for vertical stripes, 'rows' for horizontal stripes, or Orientation value object
   */
  setOrientation(mode: Orientation | OrientationVO): void {
    // Convert string to value object if needed (for backward compatibility)
    const orientation =
      typeof mode === "string" ? OrientationVO.from(mode) : mode;
    this.settingsManager.orientation = orientation;

    // Re-render current image if in image mode
    if (
      !this.isCameraRunning() &&
      this.currentImageBitmap &&
      this.canvasManager.currentCanvas
    ) {
      this.imageProcessor?.render(
        this.canvasManager.currentCanvas,
        this.currentImageBitmap,
      );
    }
  }

  /**
   * Get the current RGB stripe orientation
   */
  getOrientation(): OrientationVO {
    return this.settingsManager.orientation;
  }

  /**
   * Set the pixel density for chunky pixel effect
   *
   * @param density Number of input pixels to treat as one logical pixel (1 = normal, 2+ = chunkier)
   */
  setPixelDensity(density: number): void {
    this.settingsManager.pixelDensity = density;

    // Notify camera processor to update canvas size
    this.cameraProcessor?.onPixelDensityChanged();

    // Re-render current image if in image mode
    if (
      !this.isCameraRunning() &&
      this.currentImageBitmap &&
      this.canvasManager.currentCanvas
    ) {
      this.imageProcessor?.render(
        this.canvasManager.currentCanvas,
        this.currentImageBitmap,
      );
    }
  }

  /**
   * Get the current pixel density
   */
  getPixelDensity(): number {
    return this.settingsManager.pixelDensity;
  }

  /**
   * Set interlaced rendering mode
   *
   * @param enabled true for interlaced (renders only every other scanline), false for progressive
   */
  setInterlaced(enabled: boolean): void {
    this.settingsManager.interlaced = enabled;

    // Re-render current image if in image mode
    if (
      !this.isCameraRunning() &&
      this.currentImageBitmap &&
      this.canvasManager.currentCanvas
    ) {
      this.imageProcessor?.render(
        this.canvasManager.currentCanvas,
        this.currentImageBitmap,
      );
    }
  }

  /**
   * Get the current interlaced mode
   */
  getInterlaced(): boolean {
    return this.settingsManager.interlaced;
  }

  /**
   * Set field selection for interlaced rendering
   *
   * @param field 'odd' for odd scanlines, 'even' for even scanlines
   */
  setField(field: "odd" | "even"): void {
    this.settingsManager.field = field;

    // Re-render current image if in image mode
    if (
      !this.isCameraRunning() &&
      this.currentImageBitmap &&
      this.canvasManager.currentCanvas
    ) {
      this.imageProcessor?.render(
        this.canvasManager.currentCanvas,
        this.currentImageBitmap,
      );
    }
  }

  /**
   * Get the current field selection
   */
  getField(): "odd" | "even" {
    return this.settingsManager.field;
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Clean up all GPU resources
   * Call this when done with the processor to free GPU memory
   */
  destroy(): void {
    // Stop camera if running
    this.stopCamera();

    // Disconnect settings
    this.settingsManager.disconnect();

    // Clean up pipeline
    this.pipeline.destroy();

    // Reset canvas manager
    this.canvasManager.reset();

    // Clean up GPU resources
    this.gpuContext.destroy();

    // Clear use cases
    this.imageProcessor = null;
    this.cameraProcessor = null;
    this.currentImageBitmap = null;
  }
}
