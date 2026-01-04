class h {
  constructor(t, i) {
    if (((this.width = t), (this.height = i), t <= 0 || i <= 0))
      throw new Error("Dimensions must be positive");
    if (!Number.isFinite(t) || !Number.isFinite(i))
      throw new Error("Dimensions must be finite numbers");
  }
  /**
   * Calculate aspect ratio
   */
  aspectRatio() {
    return this.width / this.height;
  }
  /**
   * Scale dimensions by a factor
   */
  scale(t) {
    return new h(Math.floor(this.width * t), Math.floor(this.height * t));
  }
  /**
   * Create from plain object (for compatibility with existing code)
   */
  static from(t) {
    return new h(t.width, t.height);
  }
  /**
   * Convert to plain object (for compatibility with existing code)
   */
  toPlain() {
    return { width: this.width, height: this.height };
  }
  /**
   * Check equality with another Dimensions instance
   */
  equals(t) {
    return this.width === t.width && this.height === t.height;
  }
}
export { h as Dimensions };
//# sourceMappingURL=Dimensions.js.map
