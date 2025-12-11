declare module "webgpu-utils" {
  export interface TextureSourceOptions {
    format?: GPUTextureFormat;
    usage?: GPUTextureUsageFlags;
    flipY?: boolean;
    mips?: boolean;
    width?: number;
    height?: number;
  }

  export function createTextureFromSource(
    device: GPUDevice,
    source: unknown,
    options?: TextureSourceOptions,
  ): GPUTexture;

  export function makeShaderDataDefinitions(code: string): unknown;

  export function makeBindGroupLayoutDescriptors(
    definitions: unknown,
    pipelineDesc?: unknown,
  ): GPUBindGroupLayoutDescriptor[];
}
