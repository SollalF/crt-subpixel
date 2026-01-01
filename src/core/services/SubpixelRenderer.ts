/**
 * Subpixel Renderer Domain Service
 * Core business logic for calculating subpixel expansion dimensions
 * Pure domain logic with no infrastructure dependencies
 */
import { Dimensions } from "../value-objects/Dimensions.js";
import { PixelDensity } from "../value-objects/PixelDensity.js";

/**
 * Domain service for subpixel rendering calculations
 */
export class SubpixelRenderer {
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
  ): Dimensions {
    const density = pixelDensity.getValue();
    const logicalWidth = input.width / density;
    const logicalHeight = input.height / density;

    // Business rule: 3x expansion for RGB subpixels
    return new Dimensions(
      Math.floor(logicalWidth * 3),
      Math.floor(logicalHeight * 3),
    );
  }
}
