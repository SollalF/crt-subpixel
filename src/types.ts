/**
 * Public types for the CRT Subpixel library
 */

export interface ProcessResult {
  /** The output GPUTexture containing the subpixel-expanded image */
  texture: GPUTexture;
  /** Width of the output texture (3x the input width) */
  width: number;
  /** Height of the output texture (3x the input height) */
  height: number;
}

export interface AdapterOptions {
  /** Optional power preference for adapter selection */
  powerPreference?: GPUPowerPreference;
  /** Optional force fallback adapter */
  forceFallbackAdapter?: boolean;
}

export type ImageInput = ImageBitmap;
