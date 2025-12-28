/**
 * Utilities for reading back GPU textures to CPU memory
 */

import type { TgpuRoot } from "typegpu";
import type { processImage } from "../pipeline/process.js";

type ProcessImageTexture = Awaited<ReturnType<typeof processImage>>["texture"];

/**
 * Extract underlying GPU texture from TypeGPU texture wrapper
 * Internal implementation detail for readback functionality
 */
function getGPUTexture(texture: ProcessImageTexture): GPUTexture {
  // TypeGPU textures wrap the underlying GPU texture - access it for buffer operations
  return (texture as unknown as { texture: GPUTexture }).texture;
}

/**
 * Read a texture back to ImageData
 * Accepts TypeGPU texture wrappers
 */
export async function readTextureToImageData(
  root: TgpuRoot,
  texture: ProcessImageTexture,
  width: number,
  height: number,
): Promise<ImageData> {
  // Extract underlying GPU texture from TypeGPU texture wrapper for buffer operations
  const gpuTexture = getGPUTexture(texture);

  // Validate dimensions
  if (width <= 0 || height <= 0) {
    throw new Error(
      `Invalid texture dimensions: ${width}x${height}. Dimensions must be greater than 0.`,
    );
  }

  // Create a buffer to hold the texture data
  const bytesPerPixel = 4; // RGBA8
  // GPU requires bytesPerRow to be a multiple of 256 bytes for optimal performance
  // We'll align it to 256 bytes
  const bytesPerRow = Math.ceil((width * bytesPerPixel) / 256) * 256;
  const bufferSize = bytesPerRow * height;

  // Access device through TypeGPU root (minimal GPU access required for readback)
  const buffer = root.device.createBuffer({
    size: bufferSize,
    usage: 0x08 | 0x01, // COPY_DST | MAP_READ (using numeric values to avoid direct type imports)
  });

  // Copy texture to buffer using device command encoder
  const encoder = root.device.createCommandEncoder();
  encoder.copyTextureToBuffer(
    { texture: gpuTexture },
    {
      buffer,
      bytesPerRow: bytesPerRow,
      rowsPerImage: height,
    },
    { width, height },
  );

  root.device.queue.submit([encoder.finish()]);

  // Wait for GPU to finish copying
  await root.device.queue.onSubmittedWorkDone();

  // Map buffer and read data
  await buffer.mapAsync(1); // READ mode (using numeric value to avoid direct type imports)
  const arrayBuffer = buffer.getMappedRange();

  // Extract only the actual pixel data (skip padding from alignment)
  const actualDataSize = width * height * bytesPerPixel;
  const data = new Uint8ClampedArray(actualDataSize);

  // Copy row by row to skip padding
  const sourceView = new Uint8Array(arrayBuffer);
  for (let y = 0; y < height; y++) {
    const sourceOffset = y * bytesPerRow;
    const destOffset = y * width * bytesPerPixel;
    data.set(
      sourceView.subarray(sourceOffset, sourceOffset + width * bytesPerPixel),
      destOffset,
    );
  }

  buffer.unmap();

  // Create ImageData
  const imageData = new ImageData(data, width, height);

  // Clean up buffer
  buffer.destroy();

  return imageData;
}

/**
 * Read a texture back to Uint8ClampedArray
 * Accepts TypeGPU texture wrappers
 */
export async function readTextureToUint8Array(
  root: TgpuRoot,
  texture: ProcessImageTexture,
  width: number,
  height: number,
): Promise<Uint8ClampedArray> {
  const imageData = await readTextureToImageData(root, texture, width, height);
  return imageData.data;
}
