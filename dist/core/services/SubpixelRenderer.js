import { Dimensions as c } from "../value-objects/Dimensions.js";
class M {
  /**
   * Calculate output dimensions for subpixel expansion
   * Business rule: Each logical pixel expands to 3x3 physical pixels (RGB subpixels)
   *
   * @param input Input dimensions
   * @param pixelDensity Pixel density (1 = normal, 2+ = chunkier)
   * @returns Output dimensions after subpixel expansion
   */
  calculateOutputDimensions(t, o) {
    const e = o.getValue(),
      l = t.width / e,
      i = t.height / e;
    return new c(Math.floor(l * 3), Math.floor(i * 3));
  }
  /**
   * Calculate the pixel density that results in the closest output height to the target
   *
   * Formula: outputHeight = floor((inputHeight / density) * 3)
   * To get outputHeight ≈ targetHeight: density ≈ inputHeight / (targetHeight / 3)
   *
   * @param input Input dimensions
   * @param targetHeight Target output height in pixels (default: 480 for 480p)
   * @returns Pixel density value that produces output closest to target height
   */
  calculatePixelDensityForTargetHeight(t, o = 480) {
    const e = t.height / (o / 3),
      l = Math.max(1, Math.floor(e)),
      i = Math.max(1, Math.ceil(e)),
      s = Math.floor((t.height / l) * 3),
      a = Math.floor((t.height / i) * 3),
      h = Math.abs(s - o),
      n = Math.abs(a - o);
    return h <= n ? l : i;
  }
}
export { M as SubpixelRenderer };
//# sourceMappingURL=SubpixelRenderer.js.map
