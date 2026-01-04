import { SubpixelRenderer as u } from "../core/services/SubpixelRenderer.js";
import { Dimensions as p } from "../core/value-objects/Dimensions.js";
import { PixelDensity as c } from "../core/value-objects/PixelDensity.js";
class d {
  constructor(i, e, t, s) {
    ((this.gpuContext = i),
      (this.pipeline = e),
      (this.canvasManager = t),
      (this.settingsManager = s),
      (this.subpixelRenderer = new u()));
  }
  subpixelRenderer;
  /**
   * Render an image with CRT subpixel effect to the canvas
   * @param canvas Target canvas element
   * @param input ImageBitmap to process
   */
  async render(i, e) {
    if (!this.gpuContext.initialized || !this.pipeline.isCreated)
      throw new Error("Processor not initialized");
    this.canvasManager.configure(i, this.gpuContext);
    const t = new p(e.width, e.height),
      s = c.from(this.settingsManager.pixelDensity);
    (this.canvasManager.setSize(t), this.gpuContext.writeInputDimensions(t));
    const n = this.subpixelRenderer.calculateOutputDimensions(t, s);
    this.gpuContext.writeOutputDimensions(n);
    const r = new VideoFrame(e, { timestamp: 0 });
    try {
      (this.pipeline.render(r, this.canvasManager.getCurrentTextureView()),
        await this.gpuContext.flush(),
        this.canvasManager.setAspectRatio(t));
      const a = this.canvasManager.currentCanvas;
      console.log(
        `Image rendered: ${a?.width}x${a?.height}, logical pixels ${n.width}x${n.height}`,
      );
    } finally {
      r.close();
    }
  }
  /**
   * Export an image with CRT effect as a Blob
   * Re-renders the image to capture the result (WebGPU clears after present)
   * @param input ImageBitmap to process and export
   * @param options Export options (type, quality)
   */
  async export(i, e = {}) {
    if (
      !this.gpuContext.initialized ||
      !this.pipeline.isCreated ||
      !this.canvasManager.isConfigured
    )
      return (
        console.warn(
          "Cannot export: processor not ready or no canvas configured",
        ),
        null
      );
    const t = e.type ?? "image/png",
      s = e.quality,
      n = new p(i.width, i.height),
      r = c.from(this.settingsManager.pixelDensity);
    this.gpuContext.writeInputDimensions(n);
    const a = this.subpixelRenderer.calculateOutputDimensions(n, r);
    this.gpuContext.writeOutputDimensions(a);
    const o = new VideoFrame(i, { timestamp: 0 });
    try {
      this.pipeline.render(o, this.canvasManager.getCurrentTextureView());
      const h = this.canvasManager.toBlobSync(t, s);
      return (await this.gpuContext.flush(), h);
    } finally {
      o.close();
    }
  }
}
export { d as ImageProcessor };
//# sourceMappingURL=ImageProcessor.js.map
