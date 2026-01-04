/**
 * Orientation Value Object
 * Type-safe representation of RGB stripe orientation
 */
export declare class Orientation {
  private readonly value;
  private static readonly COLUMNS;
  private static readonly ROWS;
  private constructor();
  /**
   * Vertical stripes (RGB columns)
   */
  static columns(): Orientation;
  /**
   * Horizontal stripes (RGB rows)
   */
  static rows(): Orientation;
  /**
   * Create from string value
   */
  static from(value: "columns" | "rows"): Orientation;
  /**
   * Get string value
   */
  getValue(): "columns" | "rows";
  /**
   * Check if orientation is columns
   */
  isColumns(): boolean;
  /**
   * Check if orientation is rows
   */
  isRows(): boolean;
  /**
   * Convert to boolean for GPU buffer (true = rows, false = columns)
   */
  toBoolean(): boolean;
  /**
   * Check equality with another Orientation instance
   */
  equals(other: Orientation): boolean;
}
//# sourceMappingURL=Orientation.d.ts.map
