/**
 * GPU Context Management
 * Handles WebGPU device initialization, uniform buffers, and sampler creation
 */
import tgpu, { type TgpuRoot, type TgpuUniform } from "typegpu";
import * as d from "typegpu/data";

import { Dimensions } from "../core/value-objects/Dimensions.js";
import type { IGpuContext } from "../core/repositories/IGpuContext.js";

/**
 * Manages WebGPU resources including device, buffers, and samplers
 */
export class GpuContext implements IGpuContext {
  private root: TgpuRoot | null = null;
  private _sampler: ReturnType<TgpuRoot["~unstable"]["createSampler"]> | null =
    null;
  private _outputDimensionsBuffer: TgpuUniform<d.Vec2u> | null = null;
  private _inputDimensionsBuffer: TgpuUniform<d.Vec2u> | null = null;
  private _orientationBuffer: TgpuUniform<d.U32> | null = null;
  private _pixelDensityBuffer: TgpuUniform<d.U32> | null = null;
  private _presentationFormat: GPUTextureFormat | null = null;
  private _initialized = false;

  /**
   * Check if GPU context is initialized
   */
  get initialized(): boolean {
    return this._initialized;
  }

  /**
   * Get the TypeGPU root (throws if not initialized)
   */
  get tgpuRoot(): TgpuRoot {
    if (!this.root) {
      throw new Error("GpuContext not initialized");
    }
    return this.root;
  }

  /**
   * Get the GPU device (throws if not initialized)
   */
  get device(): GPUDevice {
    return this.tgpuRoot.device;
  }

  /**
   * Get the texture sampler (throws if not initialized)
   */
  get sampler(): ReturnType<TgpuRoot["~unstable"]["createSampler"]> {
    if (!this._sampler) {
      throw new Error("GpuContext not initialized");
    }
    return this._sampler;
  }

  /**
   * Get the presentation format (throws if not initialized)
   */
  get presentationFormat(): GPUTextureFormat {
    if (!this._presentationFormat) {
      throw new Error("GpuContext not initialized");
    }
    return this._presentationFormat;
  }

  /**
   * Get the output dimensions buffer (throws if not initialized)
   */
  get outputDimensionsBuffer(): TgpuUniform<d.Vec2u> {
    if (!this._outputDimensionsBuffer) {
      throw new Error("GpuContext not initialized");
    }
    return this._outputDimensionsBuffer;
  }

  /**
   * Get the input dimensions buffer (throws if not initialized)
   */
  get inputDimensionsBuffer(): TgpuUniform<d.Vec2u> {
    if (!this._inputDimensionsBuffer) {
      throw new Error("GpuContext not initialized");
    }
    return this._inputDimensionsBuffer;
  }

  /**
   * Get the orientation buffer (throws if not initialized)
   */
  get orientationBuffer(): TgpuUniform<d.U32> {
    if (!this._orientationBuffer) {
      throw new Error("GpuContext not initialized");
    }
    return this._orientationBuffer;
  }

  /**
   * Get the pixel density buffer (throws if not initialized)
   */
  get pixelDensityBuffer(): TgpuUniform<d.U32> {
    if (!this._pixelDensityBuffer) {
      throw new Error("GpuContext not initialized");
    }
    return this._pixelDensityBuffer;
  }

  /**
   * Initialize WebGPU device and create shared resources
   */
  async init(): Promise<void> {
    if (this._initialized) {
      console.log("GpuContext already initialized");
      return;
    }

    // TypeGPU handles WebGPU initialization and error checking
    this.root = await tgpu.init();

    // Handle device loss
    this.root.device.lost.then((info) => {
      console.error(`GPU device was lost: ${info.message}`);
    });

    console.log("GPU device initialized");

    // Create shared sampler for texture sampling
    this._sampler = this.root["~unstable"].createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });

    // Create uniform buffers
    this._outputDimensionsBuffer = this.root.createUniform(
      d.vec2u,
      d.vec2u(1, 1),
    );

    this._inputDimensionsBuffer = this.root.createUniform(
      d.vec2u,
      d.vec2u(1, 1),
    );

    this._orientationBuffer = this.root.createUniform(d.u32, 0);

    this._pixelDensityBuffer = this.root.createUniform(d.u32, 1);

    // Get preferred canvas format
    this._presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    this._initialized = true;
  }

  /**
   * Update output dimensions uniform buffer
   */
  writeOutputDimensions(dimensions: Dimensions): void {
    this.outputDimensionsBuffer.write(
      d.vec2u(dimensions.width, dimensions.height),
    );
  }

  /**
   * Update input dimensions uniform buffer
   */
  writeInputDimensions(dimensions: Dimensions): void {
    this.inputDimensionsBuffer.write(
      d.vec2u(dimensions.width, dimensions.height),
    );
  }

  /**
   * Update orientation uniform buffer
   * @param isRows true for horizontal stripes, false for vertical stripes
   */
  writeOrientation(isRows: boolean): void {
    this.orientationBuffer.write(isRows ? 1 : 0);
  }

  /**
   * Update pixel density uniform buffer
   */
  writePixelDensity(density: number): void {
    this.pixelDensityBuffer.write(Math.max(1, Math.floor(density)));
  }

  /**
   * Create a bind group using the TypeGPU root
   */
  createBindGroup<T extends Parameters<TgpuRoot["createBindGroup"]>[0]>(
    layout: T,
    entries: Parameters<TgpuRoot["createBindGroup"]>[1],
  ): ReturnType<TgpuRoot["createBindGroup"]> {
    return this.tgpuRoot.createBindGroup(layout, entries);
  }

  /**
   * Wait for all submitted GPU work to complete
   */
  async flush(): Promise<void> {
    await this.device.queue.onSubmittedWorkDone();
  }

  /**
   * Clean up all GPU resources
   */
  destroy(): void {
    if (this.root) {
      this.root.destroy();
      this.root = null;
    }

    this._sampler = null;
    this._outputDimensionsBuffer = null;
    this._inputDimensionsBuffer = null;
    this._orientationBuffer = null;
    this._pixelDensityBuffer = null;
    this._presentationFormat = null;
    this._initialized = false;
  }
}
