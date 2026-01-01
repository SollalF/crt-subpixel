/**
 * Pixel Density Value Object
 * Immutable representation of pixel density with validation
 */
export class PixelDensity {
  private static readonly MIN_VALUE = 1;

  private constructor(private readonly value: number) {}

  /**
   * Create a PixelDensity instance
   * @param value Must be >= 1
   */
  static create(value: number): PixelDensity {
    const clampedValue = Math.max(PixelDensity.MIN_VALUE, Math.floor(value));
    if (!Number.isFinite(clampedValue)) {
      throw new Error("Pixel density must be a finite number");
    }
    return new PixelDensity(clampedValue);
  }

  /**
   * Get the numeric value
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Create from plain number (for compatibility)
   */
  static from(value: number): PixelDensity {
    return PixelDensity.create(value);
  }

  /**
   * Check equality with another PixelDensity instance
   */
  equals(other: PixelDensity): boolean {
    return this.value === other.value;
  }
}
