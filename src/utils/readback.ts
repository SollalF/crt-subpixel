/**
 * Utilities for reading back GPU textures to CPU memory
 */

import type { TgpuRoot, TgpuTexture, TextureProps } from "typegpu";

/**
 * Read a texture back to ImageData
 * Accepts TypeGPU texture wrappers (with any usage flags)
 *
 * Note: WebGPU's copyTextureToBuffer API requires access to the underlying GPUTexture.
 * TypeGPU doesn't provide a high-level readback API, so we must access the wrapped texture.
 */
export async function readTextureToImageData<T extends TextureProps>(
  root: TgpuRoot,
  texture: TgpuTexture<T>,
  width: number,
  height: number,
): Promise<ImageData> {
  // Validate dimensions
  if (width <= 0 || height <= 0) {
    throw new Error(
      `Invalid texture dimensions: ${width}x${height}. Dimensions must be greater than 0.`,
    );
  }

  // Create buffer with copy-dst usage to receive texture data
  // Calculate bytes per row (4 bytes per pixel for rgba8unorm)
  // WebGPU requires bytesPerRow to be 256-byte aligned
  const bytesPerPixel = 4;
  const bytesPerRow = width * bytesPerPixel;
  const alignedBytesPerRow = Math.ceil(bytesPerRow / 256) * 256;
  const bufferSize = alignedBytesPerRow * height;

  // Create WebGPU buffer directly for readback (need direct access for copyTextureToBuffer)
  const gpuBuffer = root.device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  // Use WebGPU command encoder to copy texture to buffer
  // Access underlying GPUTexture from TypeGPU wrapper
  // TypeGPU may expose underlying objects via various properties
  const encoder = root.device.createCommandEncoder();
  const gpuTexture = root.unwrap(texture);

  encoder.copyTextureToBuffer(
    {
      texture: gpuTexture,
    },
    {
      buffer: gpuBuffer,
      bytesPerRow: alignedBytesPerRow,
      rowsPerImage: height,
    },
    {
      width,
      height,
      depthOrArrayLayers: 1,
    },
  );
  root.device.queue.submit([encoder.finish()]);

  // Wait for GPU to finish copying
  await root.device.queue.onSubmittedWorkDone();

  // Map buffer for reading
  await gpuBuffer.mapAsync(GPUMapMode.READ);
  const mappedRange = gpuBuffer.getMappedRange();

  // Copy the entire mapped range to a new ArrayBuffer before unmapping
  // This ensures we have an independent copy that won't be affected by unmapping
  // Create a new ArrayBuffer and copy the data
  const rawDataBuffer = new ArrayBuffer(mappedRange.byteLength);
  const rawDataView = new Uint8Array(rawDataBuffer);
  rawDataView.set(new Uint8Array(mappedRange));

  // Unmap buffer immediately after copying
  gpuBuffer.unmap();

  // Extract actual pixel data, skipping padding at end of each row
  // The buffer has aligned rows, but we only need the actual pixel data
  const data = new Uint8ClampedArray(width * height * bytesPerPixel);
  for (let y = 0; y < height; y++) {
    const srcOffset = y * alignedBytesPerRow;
    const dstOffset = y * bytesPerRow;
    // Copy row data from the independent buffer
    const rowData = rawDataView.slice(srcOffset, srcOffset + bytesPerRow);
    data.set(rowData, dstOffset);
  }

  // Create ImageData
  const imageData = new ImageData(data, width, height);

  // Clean up buffer
  gpuBuffer.destroy();

  return imageData;
}
