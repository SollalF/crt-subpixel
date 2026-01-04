import { Dimensions } from "../value-objects/Dimensions.js";
import { PixelDensity } from "../value-objects/PixelDensity.js";
/**
 * Domain service for subpixel rendering calculations
 */
export declare class SubpixelRenderer {
  /**
   * Calculate output dimensions for subpixel expansion
   * Business rule: Each logical pixel expands to 3x3 physical pixels (RGB subpixels)
   *
   * @param input Input dimensions
   * @param pixelDensity Pixel density (1 = normal, 2+ = chunkier)
   * @returns Output dimensions after subpixel expansion
   */
  calculateOutputDimensions(
    input: Dimensions,
    pixelDensity: PixelDensity,
  ): Dimensions;
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
  calculatePixelDensityForTargetHeight(
    input: Dimensions,
    targetHeight?: number,
  ): number;
}
//# sourceMappingURL=SubpixelRenderer.d.ts.map
