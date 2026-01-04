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
export { CrtSubpixelProcessor } from "./presentation/CrtSubpixelProcessor.js";
export type {
  Orientation,
  ProcessorSettings,
  ExportOptions,
  CameraOptions,
  InterlaceField,
} from "./core/types.js";
export type {
  IGpuContext,
  IRenderPipeline,
  ICanvasManager,
  ICameraManager,
  ISettingsManager,
} from "./core/ports/index.js";
export { Dimensions } from "./core/value-objects/index.js";
export { Orientation as OrientationVO } from "./core/value-objects/Orientation.js";
export { SubpixelRenderer } from "./core/services/index.js";
//# sourceMappingURL=index.d.ts.map
