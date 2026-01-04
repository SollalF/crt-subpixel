import r from "typegpu";
import * as i from "typegpu/data";
class u {
  root = null;
  _sampler = null;
  _outputDimensionsBuffer = null;
  _inputDimensionsBuffer = null;
  _orientationBuffer = null;
  _pixelDensityBuffer = null;
  _interlacedBuffer = null;
  _fieldBuffer = null;
  _presentationFormat = null;
  _initialized = !1;
  /**
   * Check if GPU context is initialized
   */
  get initialized() {
    return this._initialized;
  }
  /**
   * Get the TypeGPU root (throws if not initialized)
   */
  get tgpuRoot() {
    if (!this.root) throw new Error("GpuContext not initialized");
    return this.root;
  }
  /**
   * Get the GPU device (throws if not initialized)
   */
  get device() {
    return this.tgpuRoot.device;
  }
  /**
   * Get the texture sampler (throws if not initialized)
   */
  get sampler() {
    if (!this._sampler) throw new Error("GpuContext not initialized");
    return this._sampler;
  }
  /**
   * Get the presentation format (throws if not initialized)
   */
  get presentationFormat() {
    if (!this._presentationFormat)
      throw new Error("GpuContext not initialized");
    return this._presentationFormat;
  }
  /**
   * Get the output dimensions buffer (throws if not initialized)
   */
  get outputDimensionsBuffer() {
    if (!this._outputDimensionsBuffer)
      throw new Error("GpuContext not initialized");
    return this._outputDimensionsBuffer;
  }
  /**
   * Get the input dimensions buffer (throws if not initialized)
   */
  get inputDimensionsBuffer() {
    if (!this._inputDimensionsBuffer)
      throw new Error("GpuContext not initialized");
    return this._inputDimensionsBuffer;
  }
  /**
   * Get the orientation buffer (throws if not initialized)
   */
  get orientationBuffer() {
    if (!this._orientationBuffer) throw new Error("GpuContext not initialized");
    return this._orientationBuffer;
  }
  /**
   * Get the pixel density buffer (throws if not initialized)
   */
  get pixelDensityBuffer() {
    if (!this._pixelDensityBuffer)
      throw new Error("GpuContext not initialized");
    return this._pixelDensityBuffer;
  }
  /**
   * Get the interlaced buffer (throws if not initialized)
   */
  get interlacedBuffer() {
    if (!this._interlacedBuffer) throw new Error("GpuContext not initialized");
    return this._interlacedBuffer;
  }
  /**
   * Get the field buffer (throws if not initialized)
   */
  get fieldBuffer() {
    if (!this._fieldBuffer) throw new Error("GpuContext not initialized");
    return this._fieldBuffer;
  }
  /**
   * Initialize WebGPU device and create shared resources
   */
  async init() {
    if (this._initialized) {
      console.log("GpuContext already initialized");
      return;
    }
    ((this.root = await r.init()),
      this.root.device.lost.then((t) => {
        console.error(`GPU device was lost: ${t.message}`);
      }),
      console.log("GPU device initialized"),
      (this._sampler = this.root["~unstable"].createSampler({
        magFilter: "linear",
        minFilter: "linear",
      })),
      (this._outputDimensionsBuffer = this.root.createUniform(
        i.vec2u,
        i.vec2u(1, 1),
      )),
      (this._inputDimensionsBuffer = this.root.createUniform(
        i.vec2u,
        i.vec2u(1, 1),
      )),
      (this._orientationBuffer = this.root.createUniform(i.u32, 0)),
      (this._pixelDensityBuffer = this.root.createUniform(i.u32, 1)),
      (this._interlacedBuffer = this.root.createUniform(i.u32, 0)),
      (this._fieldBuffer = this.root.createUniform(i.u32, 1)),
      (this._presentationFormat = navigator.gpu.getPreferredCanvasFormat()),
      (this._initialized = !0));
  }
  /**
   * Update output dimensions uniform buffer
   */
  writeOutputDimensions(t) {
    this.outputDimensionsBuffer.write(i.vec2u(t.width, t.height));
  }
  /**
   * Update input dimensions uniform buffer
   */
  writeInputDimensions(t) {
    this.inputDimensionsBuffer.write(i.vec2u(t.width, t.height));
  }
  /**
   * Update orientation uniform buffer
   * @param isRows true for horizontal stripes, false for vertical stripes
   */
  writeOrientation(t) {
    this.orientationBuffer.write(t ? 1 : 0);
  }
  /**
   * Update pixel density uniform buffer
   */
  writePixelDensity(t) {
    this.pixelDensityBuffer.write(Math.max(1, Math.floor(t)));
  }
  /**
   * Update interlaced uniform buffer
   * @param enabled true for interlaced, false for progressive
   */
  writeInterlaced(t) {
    this.interlacedBuffer.write(t ? 1 : 0);
  }
  /**
   * Update field uniform buffer
   * @param isOdd true for odd field, false for even field
   */
  writeField(t) {
    this.fieldBuffer.write(t ? 1 : 0);
  }
  /**
   * Create a bind group using the TypeGPU root
   */
  createBindGroup(t, e) {
    return this.tgpuRoot.createBindGroup(t, e);
  }
  /**
   * Wait for all submitted GPU work to complete
   */
  async flush() {
    await this.device.queue.onSubmittedWorkDone();
  }
  /**
   * Clean up all GPU resources
   */
  destroy() {
    (this.root && (this.root.destroy(), (this.root = null)),
      (this._sampler = null),
      (this._outputDimensionsBuffer = null),
      (this._inputDimensionsBuffer = null),
      (this._orientationBuffer = null),
      (this._pixelDensityBuffer = null),
      (this._interlacedBuffer = null),
      (this._fieldBuffer = null),
      (this._presentationFormat = null),
      (this._initialized = !1));
  }
}
export { u as GpuContext };
//# sourceMappingURL=GpuContext.js.map
