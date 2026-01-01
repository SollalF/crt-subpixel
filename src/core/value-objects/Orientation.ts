/**
 * Orientation Value Object
 * Type-safe representation of RGB stripe orientation
 */
export class Orientation {
  private static readonly COLUMNS = new Orientation("columns");
  private static readonly ROWS = new Orientation("rows");

  private constructor(private readonly value: "columns" | "rows") {}

  /**
   * Vertical stripes (RGB columns)
   */
  static columns(): Orientation {
    return Orientation.COLUMNS;
  }

  /**
   * Horizontal stripes (RGB rows)
   */
  static rows(): Orientation {
    return Orientation.ROWS;
  }

  /**
   * Create from string value
   */
  static from(value: "columns" | "rows"): Orientation {
    return value === "columns" ? Orientation.COLUMNS : Orientation.ROWS;
  }

  /**
   * Get string value
   */
  getValue(): "columns" | "rows" {
    return this.value;
  }

  /**
   * Check if orientation is columns
   */
  isColumns(): boolean {
    return this.value === "columns";
  }

  /**
   * Check if orientation is rows
   */
  isRows(): boolean {
    return this.value === "rows";
  }

  /**
   * Convert to boolean for GPU buffer (true = rows, false = columns)
   */
  toBoolean(): boolean {
    return this.value === "rows";
  }

  /**
   * Check equality with another Orientation instance
   */
  equals(other: Orientation): boolean {
    return this.value === other.value;
  }
}
