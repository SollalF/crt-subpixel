import { Orientation as s } from "../core/value-objects/Orientation.js";
import { GpuContext as n } from "../infrastructure/GpuContext.js";
import { RenderPipeline as o } from "../infrastructure/RenderPipeline.js";
import { CanvasManager as g } from "../infrastructure/CanvasManager.js";
import { CameraManager as c } from "../infrastructure/CameraManager.js";
import { SettingsManager as m } from "../infrastructure/SettingsManager.js";
import { ImageProcessor as h } from "../use-cases/ImageProcessor.js";
import { CameraProcessor as l } from "../use-cases/CameraProcessor.js";
class w {
  // Infrastructure components
  gpuContext;
  pipeline;
  canvasManager;
  cameraManager;
  settingsManager;
  // Use cases
  imageProcessor = null;
  cameraProcessor = null;
  // Track current image for re-rendering
  currentImageBitmap = null;
  constructor(e, t, r, a, i) {
    ((this.gpuContext = e ?? new n()),
      (this.pipeline = t ?? new o()),
      (this.canvasManager = r ?? new g()),
      (this.cameraManager = a ?? new c()),
      (this.settingsManager = i ?? new m()));
  }
  /**
   * Check if processor is initialized
   */
  get initialized() {
    return this.gpuContext.initialized;
  }
  /**
   * Initialize GPU device and compile shaders
   * Must be called before processing any images or starting camera
   *
   * @throws Error if GPU is not supported or initialization fails
   */
  async init() {
    if (this.initialized) {
      console.log("Processor already initialized");
      return;
    }
    (await this.gpuContext.init(),
      this.settingsManager.connect(this.gpuContext),
      this.pipeline.create(this.gpuContext),
      (this.imageProcessor = new h(
        this.gpuContext,
        this.pipeline,
        this.canvasManager,
        this.settingsManager,
      )),
      (this.cameraProcessor = new l(
        this.gpuContext,
        this.pipeline,
        this.canvasManager,
        this.cameraManager,
        this.settingsManager,
      )),
      console.log("CrtSubpixelProcessor initialized"));
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
  async renderImage(e, t) {
    if (!this.imageProcessor)
      throw new Error(
        "Processor not initialized. Call init() before rendering images.",
      );
    (this.isCameraRunning() && this.stopCamera(),
      (this.currentImageBitmap = t),
      await this.imageProcessor.render(e, t));
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
  async exportImage(e, t = "image/png", r) {
    return this.imageProcessor
      ? this.imageProcessor.export(e, { type: t, quality: r })
      : (console.warn("Processor not initialized"), null);
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
  async startCamera(e, t) {
    if (!this.cameraProcessor)
      throw new Error("Processor not initialized. Call init() first.");
    await this.cameraProcessor.start(e, t);
  }
  /**
   * Stop camera and clean up camera resources
   */
  stopCamera() {
    this.cameraProcessor?.stop();
  }
  /**
   * Check if camera is currently running
   */
  isCameraRunning() {
    return this.cameraProcessor?.isRunning ?? !1;
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
  async exportCameraFrame(e = "image/png", t) {
    return this.cameraProcessor
      ? this.cameraProcessor.exportFrame({ type: e, quality: t })
      : (console.warn("Processor not initialized"), null);
  }
  // ============================================
  // Settings
  // ============================================
  /**
   * Set the RGB stripe orientation
   *
   * @param mode 'columns' for vertical stripes, 'rows' for horizontal stripes, or Orientation value object
   */
  setOrientation(e) {
    const t = typeof e == "string" ? s.from(e) : e;
    ((this.settingsManager.orientation = t),
      !this.isCameraRunning() &&
        this.currentImageBitmap &&
        this.canvasManager.currentCanvas &&
        this.imageProcessor?.render(
          this.canvasManager.currentCanvas,
          this.currentImageBitmap,
        ));
  }
  /**
   * Get the current RGB stripe orientation
   */
  getOrientation() {
    return this.settingsManager.orientation;
  }
  /**
   * Set the pixel density for chunky pixel effect
   *
   * @param density Number of input pixels to treat as one logical pixel (1 = normal, 2+ = chunkier)
   */
  setPixelDensity(e) {
    ((this.settingsManager.pixelDensity = e),
      this.cameraProcessor?.onPixelDensityChanged(),
      !this.isCameraRunning() &&
        this.currentImageBitmap &&
        this.canvasManager.currentCanvas &&
        this.imageProcessor?.render(
          this.canvasManager.currentCanvas,
          this.currentImageBitmap,
        ));
  }
  /**
   * Get the current pixel density
   */
  getPixelDensity() {
    return this.settingsManager.pixelDensity;
  }
  /**
   * Set interlaced rendering mode
   *
   * @param enabled true for interlaced (renders only every other scanline), false for progressive
   */
  setInterlaced(e) {
    ((this.settingsManager.interlaced = e),
      !this.isCameraRunning() &&
        this.currentImageBitmap &&
        this.canvasManager.currentCanvas &&
        this.imageProcessor?.render(
          this.canvasManager.currentCanvas,
          this.currentImageBitmap,
        ));
  }
  /**
   * Get the current interlaced mode
   */
  getInterlaced() {
    return this.settingsManager.interlaced;
  }
  /**
   * Set field selection for interlaced rendering
   *
   * @param field 'odd' for odd scanlines, 'even' for even scanlines
   */
  setField(e) {
    ((this.settingsManager.field = e),
      !this.isCameraRunning() &&
        this.currentImageBitmap &&
        this.canvasManager.currentCanvas &&
        this.imageProcessor?.render(
          this.canvasManager.currentCanvas,
          this.currentImageBitmap,
        ));
  }
  /**
   * Get the current field selection
   */
  getField() {
    return this.settingsManager.field;
  }
  // ============================================
  // Cleanup
  // ============================================
  /**
   * Clean up all GPU resources
   * Call this when done with the processor to free GPU memory
   */
  destroy() {
    (this.stopCamera(),
      this.settingsManager.disconnect(),
      this.pipeline.destroy(),
      this.canvasManager.reset(),
      this.gpuContext.destroy(),
      (this.imageProcessor = null),
      (this.cameraProcessor = null),
      (this.currentImageBitmap = null));
  }
}
export { w as CrtSubpixelProcessor };
//# sourceMappingURL=CrtSubpixelProcessor.js.map
