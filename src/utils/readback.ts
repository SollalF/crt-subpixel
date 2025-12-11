/**
 * Utilities for reading back GPU textures to CPU memory
 */

/**
 * Read a GPUTexture back to ImageData
 */
export async function readTextureToImageData(
  device: GPUDevice,
  queue: GPUQueue,
  texture: GPUTexture,
  width: number,
  height: number,
): Promise<ImageData> {
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

  const buffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  // Copy texture to buffer
  const encoder = device.createCommandEncoder();
  encoder.copyTextureToBuffer(
    { texture },
    {
      buffer,
      bytesPerRow: bytesPerRow,
      rowsPerImage: height,
    },
    { width, height },
  );

  queue.submit([encoder.finish()]);

  // Wait for GPU to finish copying
  await queue.onSubmittedWorkDone();

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
 * Read a GPUTexture back to Uint8ClampedArray
 */
export async function readTextureToUint8Array(
  device: GPUDevice,
  queue: GPUQueue,
  texture: GPUTexture,
  width: number,
  height: number,
): Promise<Uint8ClampedArray> {
  const imageData = await readTextureToImageData(
    device,
    queue,
    texture,
    width,
    height,
  );
  return imageData.data;
}
