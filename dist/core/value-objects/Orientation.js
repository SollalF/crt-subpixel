class s {
  constructor(u) {
    this.value = u;
  }
  static COLUMNS = new s("columns");
  static ROWS = new s("rows");
  /**
   * Vertical stripes (RGB columns)
   */
  static columns() {
    return s.COLUMNS;
  }
  /**
   * Horizontal stripes (RGB rows)
   */
  static rows() {
    return s.ROWS;
  }
  /**
   * Create from string value
   */
  static from(u) {
    return u === "columns" ? s.COLUMNS : s.ROWS;
  }
  /**
   * Get string value
   */
  getValue() {
    return this.value;
  }
  /**
   * Check if orientation is columns
   */
  isColumns() {
    return this.value === "columns";
  }
  /**
   * Check if orientation is rows
   */
  isRows() {
    return this.value === "rows";
  }
  /**
   * Convert to boolean for GPU buffer (true = rows, false = columns)
   */
  toBoolean() {
    return this.value === "rows";
  }
  /**
   * Check equality with another Orientation instance
   */
  equals(u) {
    return this.value === u.value;
  }
}
export { s as Orientation };
//# sourceMappingURL=Orientation.js.map
