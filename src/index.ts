/**
 * CRT Subpixel Processing Library
 *
 * A WebGPU-based library for expanding images into CRT-style subpixel patterns.
 * Each input pixel is expanded into a 3x3 block with vertical RGB stripes.
 *
 * Supports both static images and real-time camera input.
 * Both render directly to canvas and use canvas.toBlob() for export.
 *
 * Browser Support: Chrome/Edge desktop (requires secure context)
 */

// Main processor facade
export { CrtSubpixelProcessor } from "./CrtSubpixelProcessor.js";

// Core types
export type {
  Orientation,
  ProcessorSettings,
  Dimensions,
  ExportOptions,
  CameraOptions,
} from "./core/types.js";
