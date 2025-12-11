/**
 * WebGPU device and context management
 */

export interface WebGPUDevice {
  device: GPUDevice;
  queue: GPUQueue;
  format: GPUTextureFormat;
}

/**
 * Initialize WebGPU adapter and device
 * @throws Error if WebGPU is not supported or initialization fails
 */
export async function initWebGPU(
  options?: GPURequestAdapterOptions,
): Promise<WebGPUDevice> {
  if (!navigator.gpu) {
    throw new Error(
      "WebGPU is not supported in this browser. Requires Chrome/Edge with WebGPU enabled.",
    );
  }

  const adapter = await navigator.gpu.requestAdapter(options);
  if (!adapter) {
    throw new Error("Failed to request WebGPU adapter");
  }

  const device = await adapter.requestDevice();
  if (!device) {
    throw new Error("Failed to request WebGPU device");
  }

  console.log("WebGPU adapter", adapter);

  // Use RGBA8Unorm for both input and output textures
  const format: GPUTextureFormat = "rgba8unorm";

  return {
    device,
    queue: device.queue,
    format,
  };
}
