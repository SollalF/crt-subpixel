/**
 * Core types for CRT Subpixel Processor
 * This file has no dependencies on other src modules to prevent circular imports
 */

/**
 * RGB stripe orientation mode
 */
export type Orientation = "columns" | "rows";

/**
 * Processor settings that can be modified at runtime
 */
export interface ProcessorSettings {
  /** RGB stripe orientation ('columns' for vertical, 'rows' for horizontal) */
  orientation: Orientation;
  /** Pixel density for chunky pixel effect (1 = normal, 2+ = chunkier) */
  pixelDensity: number;
}

/**
 * Default processor settings
 */
export const DEFAULT_SETTINGS: ProcessorSettings = {
  orientation: "columns",
  pixelDensity: 1,
};

/**
 * Dimensions of an image or canvas
 */
export interface Dimensions {
  width: number;
  height: number;
}

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
export const DEFAULT_EXPORT_OPTIONS: Required<ExportOptions> = {
  type: "image/png",
  quality: 1,
};

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
export const DEFAULT_CAMERA_OPTIONS: Required<CameraOptions> = {
  facingMode: "user",
  width: 1280,
  height: 720,
  frameRate: 60,
};
