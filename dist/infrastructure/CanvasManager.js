import { Dimensions as a } from "../core/value-objects/Dimensions.js";
class i {
  canvas = null;
  context = null;
  /**
   * Get the current canvas (if configured)
   */
  get currentCanvas() {
    return this.canvas;
  }
  /**
   * Get the current WebGPU context (if configured)
   */
  get currentContext() {
    return this.context;
  }
  /**
   * Check if canvas is configured
   */
  get isConfigured() {
    return this.canvas !== null && this.context !== null;
  }
  /**
   * Configure canvas for WebGPU rendering
   * @param canvas The canvas element to configure
   * @param gpuContext The GPU context to use
   * @throws Error if WebGPU context cannot be obtained
   */
  configure(t, e) {
    const n = t.getContext("webgpu");
    if (!n) throw new Error("Failed to get WebGPU context from canvas");
    ((this.canvas = t),
      (this.context = n),
      n.configure({
        device: e.device,
        format: e.presentationFormat,
        alphaMode: "premultiplied",
      }));
  }
  /**
   * Set canvas size to match input dimensions with 3x expansion
   * @param inputDimensions The input image/video dimensions
   * @returns The resulting canvas dimensions
   */
  setSize(t) {
    if (!this.canvas) throw new Error("Canvas not configured");
    const e = Math.floor(t.width * 3),
      n = Math.floor(t.height * 3);
    return ((this.canvas.width = e), (this.canvas.height = n), new a(e, n));
  }
  /**
   * Update canvas aspect ratio based on input dimensions
   */
  setAspectRatio(t) {
    if (!this.canvas) throw new Error("Canvas not configured");
    const e = t.width / t.height;
    this.canvas.style.aspectRatio = `${e}`;
  }
  /**
   * Get the current texture view for rendering
   * @throws Error if canvas is not configured
   */
  getCurrentTextureView() {
    if (!this.context) throw new Error("Canvas not configured");
    return this.context.getCurrentTexture().createView();
  }
  /**
   * Export canvas content as a Blob
   * @param type Image MIME type
   * @param quality Image quality (for lossy formats)
   */
  async toBlob(t = "image/png", e) {
    return this.canvas
      ? new Promise((n) => {
          this.canvas.toBlob((r) => n(r), t, e);
        })
      : null;
  }
  /**
   * Start a synchronous blob export (returns promise but starts immediately)
   * This is important for WebGPU where the backbuffer may be invalidated
   */
  toBlobSync(t = "image/png", e) {
    return this.canvas
      ? new Promise((n) => {
          this.canvas.toBlob((r) => n(r), t, e);
        })
      : Promise.resolve(null);
  }
  /**
   * Reset canvas manager state
   */
  reset() {
    ((this.canvas = null), (this.context = null));
  }
}
export { i as CanvasManager };
//# sourceMappingURL=CanvasManager.js.map
