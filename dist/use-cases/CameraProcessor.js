import { SubpixelRenderer as c } from "../core/services/SubpixelRenderer.js";
import { Dimensions as o } from "../core/value-objects/Dimensions.js";
import { PixelDensity as g } from "../core/value-objects/PixelDensity.js";
class x {
  constructor(t, i, e, s, a) {
    ((this.gpuContext = t),
      (this.pipeline = i),
      (this.canvasManager = e),
      (this.cameraManager = s),
      (this.settingsManager = a),
      (this.subpixelRenderer = new c()));
  }
  videoFrameCallbackId;
  lastFrameSize = null;
  pendingExport = null;
  frameCount = 0;
  subpixelRenderer;
  /**
   * Check if camera processing is active
   */
  get isRunning() {
    return this.cameraManager.isActive;
  }
  /**
   * Update canvas size for new frame dimensions
   */
  updateCanvasSize(t, i) {
    const e = new o(t, i),
      s = g.from(this.settingsManager.pixelDensity);
    this.canvasManager.setSize(e);
    const a = this.subpixelRenderer.calculateOutputDimensions(e, s);
    (this.gpuContext.writeOutputDimensions(a),
      this.canvasManager.setAspectRatio(e));
    const n = this.canvasManager.currentCanvas;
    console.log(
      `Canvas size: ${n?.width}x${n?.height}, rendering ${a.width}x${a.height} pixels`,
    );
  }
  /**
   * Process a video frame callback
   */
  processVideoFrame = (t, i) => {
    if (
      !this.gpuContext.initialized ||
      !this.pipeline.isCreated ||
      !this.canvasManager.isConfigured ||
      !this.cameraManager.isActive
    )
      return;
    const e = this.cameraManager.video;
    if (!e || e.readyState < 2) {
      this.scheduleNextFrame();
      return;
    }
    const s = i.width,
      a = i.height,
      n = new o(s, a);
    if (
      (this.gpuContext.writeInputDimensions(n),
      (!this.lastFrameSize || !this.lastFrameSize.equals(n)) &&
        ((this.lastFrameSize = n), this.updateCanvasSize(s, a)),
      this.settingsManager.interlaced)
    ) {
      const r = this.frameCount % 2 === 0;
      this.settingsManager.field = r ? "odd" : "even";
    }
    if (
      (this.pipeline.render(e, this.canvasManager.getCurrentTextureView()),
      this.frameCount++,
      this.pendingExport)
    ) {
      const { resolve: r, type: h, quality: l } = this.pendingExport;
      ((this.pendingExport = null),
        this.canvasManager.toBlobSync(h, l).then(r));
    }
    this.scheduleNextFrame();
  };
  /**
   * Schedule the next frame callback
   */
  scheduleNextFrame() {
    this.cameraManager.isActive &&
      (this.videoFrameCallbackId = this.cameraManager.requestVideoFrameCallback(
        this.processVideoFrame,
      ));
  }
  /**
   * Start camera and begin rendering to canvas
   * @param canvas Target canvas for rendering
   * @param options Camera configuration options
   */
  async start(t, i) {
    if (!this.gpuContext.initialized || !this.pipeline.isCreated)
      throw new Error("Processor not initialized");
    (this.stop(),
      this.canvasManager.configure(t, this.gpuContext),
      await this.cameraManager.start(i),
      this.scheduleNextFrame(),
      console.log("Camera processing started"));
  }
  /**
   * Stop camera processing
   */
  stop() {
    (this.videoFrameCallbackId !== void 0 &&
      (this.cameraManager.cancelVideoFrameCallback(this.videoFrameCallbackId),
      (this.videoFrameCallbackId = void 0)),
      this.cameraManager.stop(),
      (this.lastFrameSize = null),
      (this.frameCount = 0),
      this.pendingExport &&
        (this.pendingExport.resolve(null), (this.pendingExport = null)),
      console.log("Camera processing stopped"));
  }
  /**
   * Export the current camera frame as a Blob
   * @param options Export options (type, quality)
   * @returns Promise resolving to Blob or null if camera not running
   */
  async exportFrame(t = {}) {
    if (!this.canvasManager.isConfigured)
      return (console.warn("No canvas configured"), null);
    if (!this.isRunning) return (console.warn("Camera is not running"), null);
    const i = t.type ?? "image/png",
      e = t.quality;
    return new Promise((s) => {
      this.pendingExport = { resolve: s, type: i, quality: e };
    });
  }
  /**
   * Notify that pixel density changed (update canvas if running)
   */
  onPixelDensityChanged() {
    this.isRunning &&
      this.lastFrameSize &&
      this.updateCanvasSize(
        this.lastFrameSize.width,
        this.lastFrameSize.height,
      );
  }
}
export { x as CameraProcessor };
//# sourceMappingURL=CameraProcessor.js.map
