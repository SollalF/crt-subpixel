import { TgpuRoot, TgpuUniform } from "typegpu";
import { Dimensions } from "../core/value-objects/Dimensions.js";
import { IGpuContext } from "../core/ports/IGpuContext.js";
import * as d from "typegpu/data";
/**
 * Manages WebGPU resources including device, buffers, and samplers
 */
export declare class GpuContext implements IGpuContext {
  private root;
  private _sampler;
  private _outputDimensionsBuffer;
  private _inputDimensionsBuffer;
  private _orientationBuffer;
  private _pixelDensityBuffer;
  private _interlacedBuffer;
  private _fieldBuffer;
  private _presentationFormat;
  private _initialized;
  /**
   * Check if GPU context is initialized
   */
  get initialized(): boolean;
  /**
   * Get the TypeGPU root (throws if not initialized)
   */
  get tgpuRoot(): TgpuRoot;
  /**
   * Get the GPU device (throws if not initialized)
   */
  get device(): GPUDevice;
  /**
   * Get the texture sampler (throws if not initialized)
   */
  get sampler(): ReturnType<TgpuRoot["~unstable"]["createSampler"]>;
  /**
   * Get the presentation format (throws if not initialized)
   */
  get presentationFormat(): GPUTextureFormat;
  /**
   * Get the output dimensions buffer (throws if not initialized)
   */
  get outputDimensionsBuffer(): TgpuUniform<d.Vec2u>;
  /**
   * Get the input dimensions buffer (throws if not initialized)
   */
  get inputDimensionsBuffer(): TgpuUniform<d.Vec2u>;
  /**
   * Get the orientation buffer (throws if not initialized)
   */
  get orientationBuffer(): TgpuUniform<d.U32>;
  /**
   * Get the pixel density buffer (throws if not initialized)
   */
  get pixelDensityBuffer(): TgpuUniform<d.U32>;
  /**
   * Get the interlaced buffer (throws if not initialized)
   */
  get interlacedBuffer(): TgpuUniform<d.U32>;
  /**
   * Get the field buffer (throws if not initialized)
   */
  get fieldBuffer(): TgpuUniform<d.U32>;
  /**
   * Initialize WebGPU device and create shared resources
   */
  init(): Promise<void>;
  /**
   * Update output dimensions uniform buffer
   */
  writeOutputDimensions(dimensions: Dimensions): void;
  /**
   * Update input dimensions uniform buffer
   */
  writeInputDimensions(dimensions: Dimensions): void;
  /**
   * Update orientation uniform buffer
   * @param isRows true for horizontal stripes, false for vertical stripes
   */
  writeOrientation(isRows: boolean): void;
  /**
   * Update pixel density uniform buffer
   */
  writePixelDensity(density: number): void;
  /**
   * Update interlaced uniform buffer
   * @param enabled true for interlaced, false for progressive
   */
  writeInterlaced(enabled: boolean): void;
  /**
   * Update field uniform buffer
   * @param isOdd true for odd field, false for even field
   */
  writeField(isOdd: boolean): void;
  /**
   * Create a bind group using the TypeGPU root
   */
  createBindGroup<T extends Parameters<TgpuRoot["createBindGroup"]>[0]>(
    layout: T,
    entries: Parameters<TgpuRoot["createBindGroup"]>[1],
  ): ReturnType<TgpuRoot["createBindGroup"]>;
  /**
   * Wait for all submitted GPU work to complete
   */
  flush(): Promise<void>;
  /**
   * Clean up all GPU resources
   */
  destroy(): void;
}
//# sourceMappingURL=GpuContext.d.ts.map
