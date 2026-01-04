class e {
  constructor(t) {
    this.value = t;
  }
  static MIN_VALUE = 1;
  /**
   * Create a PixelDensity instance
   * @param value Must be >= 1
   */
  static create(t) {
    const r = Math.max(e.MIN_VALUE, Math.floor(t));
    if (!Number.isFinite(r))
      throw new Error("Pixel density must be a finite number");
    return new e(r);
  }
  /**
   * Get the numeric value
   */
  getValue() {
    return this.value;
  }
  /**
   * Create from plain number (for compatibility)
   */
  static from(t) {
    return e.create(t);
  }
  /**
   * Check equality with another PixelDensity instance
   */
  equals(t) {
    return this.value === t.value;
  }
}
export { e as PixelDensity };
//# sourceMappingURL=PixelDensity.js.map
