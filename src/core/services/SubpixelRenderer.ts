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
    targetHeight: number = 480,
  ): number {
    // Calculate the ideal density: density = inputHeight / (targetHeight / 3)
    const idealDensity = input.height / (targetHeight / 3);

    // Verify which density (floor or ceil) gives us closer to target
    const densityFloor = Math.max(1, Math.floor(idealDensity));
    const densityCeil = Math.max(1, Math.ceil(idealDensity));

    const outputFloor = Math.floor((input.height / densityFloor) * 3);
    const outputCeil = Math.floor((input.height / densityCeil) * 3);

    const diffFloor = Math.abs(outputFloor - targetHeight);
    const diffCeil = Math.abs(outputCeil - targetHeight);

    return diffFloor <= diffCeil ? densityFloor : densityCeil;
  }
}
