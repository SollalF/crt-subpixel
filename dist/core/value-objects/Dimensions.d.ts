/**
 * Dimensions Value Object
 * Immutable representation of width and height with validation and behavior
 */
export declare class Dimensions {
  readonly width: number;
  readonly height: number;
  constructor(width: number, height: number);
  /**
   * Calculate aspect ratio
   */
  aspectRatio(): number;
  /**
   * Scale dimensions by a factor
   */
  scale(factor: number): Dimensions;
  /**
   * Create from plain object (for compatibility with existing code)
   */
  static from(plain: { width: number; height: number }): Dimensions;
  /**
   * Convert to plain object (for compatibility with existing code)
   */
  toPlain(): {
    width: number;
    height: number;
  };
  /**
   * Check equality with another Dimensions instance
   */
  equals(other: Dimensions): boolean;
}
//# sourceMappingURL=Dimensions.d.ts.map
