/**
 * Utilities for reading back GPU textures to CPU memory
 */

import type { TgpuRoot } from "typegpu";
import type { processImage } from "../pipeline/process.js";

type ProcessImageTexture = Awaited<ReturnType<typeof processImage>>["texture"];

/**
 * Extract underlying GPUTexture from TypeGPU texture wrapper
 */
function getGPUTexture(texture: ProcessImageTexture): GPUTexture {
  // TypeGPU textures wrap GPUTexture - access the underlying texture
  return (texture as unknown as { texture: GPUTexture }).texture;
}

/**
 * Read a texture back to ImageData
 * Accepts both GPUTexture and TypeGPU texture wrappers
 */
export async function readTextureToImageData(
  root: TgpuRoot,
  texture: GPUTexture | ProcessImageTexture,
  width: number,
  height: number,
): Promise<ImageData> {
  // Extract underlying GPUTexture if it's a TypeGPU texture
  const gpuTexture =
    "texture" in texture &&
    typeof (texture as unknown as { texture?: unknown }).texture === "object"
      ? getGPUTexture(texture as ProcessImageTexture)
      : (texture as GPUTexture);
  // Validate dimensions
  if (width <= 0 || height <= 0) {
    throw new Error(
      `Invalid texture dimensions: ${width}x${height}. Dimensions must be greater than 0.`,
    );
  }

  // Create a buffer to hold the texture data
  const bytesPerPixel = 4; // RGBA8
  // WebGPU requires bytesPerRow to be a multiple of 256 bytes for optimal performance
  // We'll align it to 256 bytes
  const bytesPerRow = Math.ceil((width * bytesPerPixel) / 256) * 256;
  const bufferSize = bytesPerRow * height;

  const buffer = root.device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  // Copy texture to buffer
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
  await buffer.mapAsync(GPUMapMode.READ);
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
 * Accepts both GPUTexture and TypeGPU texture wrappers
 */
export async function readTextureToUint8Array(
  root: TgpuRoot,
  texture: GPUTexture | ProcessImageTexture,
  width: number,
  height: number,
): Promise<Uint8ClampedArray> {
  const imageData = await readTextureToImageData(root, texture, width, height);
  return imageData.data;
}
