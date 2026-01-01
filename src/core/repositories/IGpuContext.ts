/**
 * GPU Context Repository Interface
 * Defines the contract for GPU operations required by use cases
 */
import type { TgpuRoot, TgpuUniform } from "typegpu";
import * as d from "typegpu/data";

import { Dimensions } from "../value-objects/Dimensions.js";

/**
 * Interface for GPU context operations
 * Use cases depend on this abstraction, not concrete implementations
 */
export interface IGpuContext {
  /** Check if GPU context is initialized */
  readonly initialized: boolean;

  /** Get the TypeGPU root (throws if not initialized) */
  readonly tgpuRoot: TgpuRoot;

  /** Get the GPU device (throws if not initialized) */
  readonly device: GPUDevice;

  /** Get the texture sampler (throws if not initialized) */
  readonly sampler: ReturnType<TgpuRoot["~unstable"]["createSampler"]>;

  /** Get the presentation format (throws if not initialized) */
  readonly presentationFormat: GPUTextureFormat;

  /** Get the output dimensions buffer (throws if not initialized) */
  readonly outputDimensionsBuffer: TgpuUniform<d.Vec2u>;

  /** Get the input dimensions buffer (throws if not initialized) */
  readonly inputDimensionsBuffer: TgpuUniform<d.Vec2u>;

  /** Get the orientation buffer (throws if not initialized) */
  readonly orientationBuffer: TgpuUniform<d.U32>;

  /** Get the pixel density buffer (throws if not initialized) */
  readonly pixelDensityBuffer: TgpuUniform<d.U32>;

  /** Update output dimensions uniform buffer */
  writeOutputDimensions(dimensions: Dimensions): void;

  /** Update input dimensions uniform buffer */
  writeInputDimensions(dimensions: Dimensions): void;

  /** Update orientation uniform buffer */
  writeOrientation(isRows: boolean): void;

  /** Update pixel density uniform buffer */
  writePixelDensity(density: number): void;

  /** Create a bind group using the TypeGPU root */
  createBindGroup<T extends Parameters<TgpuRoot["createBindGroup"]>[0]>(
    layout: T,
    entries: Parameters<TgpuRoot["createBindGroup"]>[1],
  ): ReturnType<TgpuRoot["createBindGroup"]>;

  /** Wait for all submitted GPU work to complete */
  flush(): Promise<void>;
}
