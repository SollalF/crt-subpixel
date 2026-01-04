import { Orientation as OrientationVO } from "./value-objects/Orientation.js";
/**
 * Core types for CRT Subpixel Processor
 * DTOs and configuration types (not domain objects)
 */
/**
 * RGB stripe orientation mode (for DTOs and backward compatibility)
 * Use Orientation value object from core/value-objects/ for domain logic
 */
export type Orientation = "columns" | "rows";
/**
 * Field selection for interlaced rendering
 */
export type InterlaceField = "odd" | "even";
/**
 * Processor settings that can be modified at runtime (DTO)
 */
export interface ProcessorSettings {
  /** RGB stripe orientation (use Orientation value object) */
  orientation: OrientationVO;
  /** Pixel density for chunky pixel effect (1 = normal, 2+ = chunkier) */
  pixelDensity: number;
  /** Enable interlaced rendering (renders only every other scanline) */
  interlaced: boolean;
  /** Field selection for interlaced rendering (odd or even scanlines) */
  field: InterlaceField;
}
/**
 * Default processor settings
 */
export declare const DEFAULT_SETTINGS: ProcessorSettings;
/**
 * Export options for saving rendered frames
 */
export interface ExportOptions {
  /** Image MIME type (e.g., 'image/png', 'image/jpeg') */
  type?: string;
  /** For lossy formats like JPEG, quality from 0 to 1 */
  quality?: number | undefined;
}
/**
 * Default export options
 */
export declare const DEFAULT_EXPORT_OPTIONS: Required<ExportOptions>;
/**
 * Camera configuration options
 */
export interface CameraOptions {
  /** Preferred camera facing mode */
  facingMode?: "user" | "environment";
  /** Preferred width */
  width?: number;
  /** Preferred height */
  height?: number;
  /** Preferred frame rate */
  frameRate?: number;
}
/**
 * Default camera options
 */
export declare const DEFAULT_CAMERA_OPTIONS: Required<CameraOptions>;
//# sourceMappingURL=types.d.ts.map
