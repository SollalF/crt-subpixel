import { fullScreenTriangle as n } from "typegpu/common";
import {
  bindGroupLayout as t,
  createSubpixelFragment as l,
} from "./shaders/subpixel-fragment.js";
class p {
  pipeline = null;
  gpuContext = null;
  /**
   * Check if pipeline is created
   */
  get isCreated() {
    return this.pipeline !== null;
  }
  /**
   * Get the bind group layout for external textures
   */
  get externalTextureLayout() {
    return t;
  }
  /**
   * Create the render pipeline
   * @param gpuContext The GPU context to use
   */
  create(e) {
    this.gpuContext = e;
    const r = l(
      e.sampler,
      e.outputDimensionsBuffer,
      e.inputDimensionsBuffer,
      e.orientationBuffer,
      e.pixelDensityBuffer,
      e.interlacedBuffer,
      e.fieldBuffer,
    );
    ((this.pipeline = e.tgpuRoot["~unstable"]
      .withVertex(n, {})
      .withFragment(r, { format: e.presentationFormat })
      .createPipeline()),
      console.log("Render pipeline created successfully"));
  }
  /**
   * Render a frame using an external texture source
   * @param source Video element or VideoFrame to render
   * @param textureView The target texture view
   */
  render(e, r) {
    if (!this.pipeline || !this.gpuContext)
      throw new Error("Pipeline not created");
    const i = this.gpuContext.createBindGroup(t, {
      externalTexture: this.gpuContext.device.importExternalTexture({
        source: e,
      }),
    });
    this.pipeline
      .with(i)
      .withColorAttachment({
        view: r,
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        storeOp: "store",
      })
      .draw(3);
  }
  /**
   * Clean up pipeline resources
   */
  destroy() {
    ((this.pipeline = null), (this.gpuContext = null));
  }
}
export { p as RenderPipeline };
//# sourceMappingURL=RenderPipeline.js.map
