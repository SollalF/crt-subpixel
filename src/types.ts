/**
 * Public types for the CRT Subpixel library
 */

import type { processImage } from "./pipeline/process.js";

export interface ProcessResult {
  /** The output TypeGPU texture containing the subpixel-expanded image */
  texture: Awaited<ReturnType<typeof processImage>>["texture"];
  /** Width of the output texture (3x the input width) */
  width: number;
  /** Height of the output texture (3x the input height) */
  height: number;
}

export type ImageInput = ImageBitmap;
