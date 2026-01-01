/**
 * Dimensions Value Object
 * Immutable representation of width and height with validation and behavior
 */
export class Dimensions {
  constructor(
    public readonly width: number,
    public readonly height: number,
  ) {
    if (width <= 0 || height <= 0) {
      throw new Error("Dimensions must be positive");
    }
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      throw new Error("Dimensions must be finite numbers");
    }
  }

  /**
   * Calculate aspect ratio
   */
  aspectRatio(): number {
    return this.width / this.height;
  }

  /**
   * Scale dimensions by a factor
   */
  scale(factor: number): Dimensions {
    return new Dimensions(
      Math.floor(this.width * factor),
      Math.floor(this.height * factor),
    );
  }

  /**
   * Create from plain object (for compatibility with existing code)
   */
  static from(plain: { width: number; height: number }): Dimensions {
    return new Dimensions(plain.width, plain.height);
  }

  /**
   * Convert to plain object (for compatibility with existing code)
   */
  toPlain(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Check equality with another Dimensions instance
   */
  equals(other: Dimensions): boolean {
    return this.width === other.width && this.height === other.height;
  }
}
