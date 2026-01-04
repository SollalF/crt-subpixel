/**
 * Pixel Density Value Object
 * Immutable representation of pixel density with validation
 */
export declare class PixelDensity {
  private readonly value;
  private static readonly MIN_VALUE;
  private constructor();
  /**
   * Create a PixelDensity instance
   * @param value Must be >= 1
   */
  static create(value: number): PixelDensity;
  /**
   * Get the numeric value
   */
  getValue(): number;
  /**
   * Create from plain number (for compatibility)
   */
  static from(value: number): PixelDensity;
  /**
   * Check equality with another PixelDensity instance
   */
  equals(other: PixelDensity): boolean;
}
//# sourceMappingURL=PixelDensity.d.ts.map
