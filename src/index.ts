/**
 * CRT Subpixel Processing Library
 *
 * A WebGPU-based library for expanding images into CRT-style subpixel patterns.
 * Each input pixel is expanded into a 3x3 block with vertical RGB stripes.
 *
 * Browser Support: Chrome/Edge desktop (requires secure context)
 */

import { processImage } from "./pipeline/process.js";
import {
  readTextureToImageData,
  readTextureToUint8Array,
} from "./utils/readback.js";
import type { ProcessResult, ImageInput } from "./types.js";
import tgpu, {
  type TgpuBindGroupLayout,
  type TgpuRoot,
  type TgpuComputePipeline,
} from "typegpu";

// Import compute function and bind group layout
import {
  subpixelBindGroupLayout,
  subpixelComputeFn,
} from "./shaders/subpixel.js";

/**
 * Main processor class for CRT subpixel expansion
 *
 * @example
 * ```typescript
 * const processor = new CrtSubpixelProcessor();
 * await processor.init();
 *
 * const result = await processor.process(imageBitmap);
 * const imageData = await processor.readbackImageData(result);
 * ```
 */
export class CrtSubpixelProcessor {
  private root: TgpuRoot | null = null;
  private format: GPUTextureFormat | null = null;
  private bindGroupLayout: TgpuBindGroupLayout | null = null;
  private computePipeline: TgpuComputePipeline | null = null;
  private initialized = false;

  /**
   * Initialize WebGPU device and compile shaders
   * Must be called before processing any images
   *
   * @param options Optional adapter configuration
   * @throws Error if WebGPU is not supported or initialization fails
   */
  async init(): Promise<void> {
    if (this.initialized) {
      console.log("Processor already initialized");
      return;
    }

    // Check browser support
    if (!navigator.gpu) {
      throw new Error(
        "WebGPU is not supported in this browser. Requires Chrome/Edge with WebGPU enabled.",
      );
    }

    this.root = await tgpu.init();
    this.format = "rgba8unorm";

    this.root.device.lost.then((info) => {
      console.error(`WebGPU device was lost: ${info.message}`);
    });

    console.log("WebGPU device initialized");

    // Create compute pipeline using TypeGPU
    // Use the '~unstable' API which is properly typed and includes withCompute
    this.bindGroupLayout = subpixelBindGroupLayout;
    this.computePipeline = this.root["~unstable"]
      .withCompute(subpixelComputeFn)
      .createPipeline();

    console.log("Compute pipeline created successfully");

    this.initialized = true;
  }

  /**
   * Process an image and expand it into CRT subpixel pattern
   *
   * @param input Image to process (ImageBitmap - JPEG/PNG formats)
   * @returns Result containing output texture and dimensions (3x input size)
   * @throws Error if not initialized or processing fails
   */
  async process(input: ImageInput): Promise<ProcessResult> {
    if (!this.initialized) {
      throw new Error(
        "Processor not initialized. Call init() before processing images.",
      );
    }

    const result = await processImage(
      this.root!,
      this.bindGroupLayout!,
      this.computePipeline!,
      input,
      this.format!,
    );

    return {
      texture: result.texture,
      width: result.width,
      height: result.height,
    };
  }

  /**
   * Read back a processed texture to ImageData
   *
   * @param result Process result from process()
   * @returns ImageData containing the subpixel-expanded image
   */
  async readbackImageData(result: ProcessResult): Promise<ImageData> {
    if (!this.initialized) {
      throw new Error("Processor not initialized");
    }

    return readTextureToImageData(
      this.root!,
      result.texture,
      result.width,
      result.height,
    );
  }

  /**
   * Read back a processed texture to Uint8ClampedArray
   *
   * @param result Process result from process()
   * @returns Uint8ClampedArray containing raw pixel data (RGBA)
   */
  async readbackUint8Array(result: ProcessResult): Promise<Uint8ClampedArray> {
    if (!this.initialized) {
      throw new Error("Processor not initialized");
    }

    return readTextureToUint8Array(
      this.root!,
      result.texture,
      result.width,
      result.height,
    );
  }

  /**
   * Render a processed texture directly to a WebGPU canvas
   * This avoids the need for CPU readback and is much faster
   *
   * @param canvas HTMLCanvasElement with WebGPU context
   * @param result Process result from process()
   * @throws Error if not initialized or canvas context is invalid
   */
  async renderToCanvas(
    canvas: HTMLCanvasElement,
    result: ProcessResult,
  ): Promise<void> {
    if (!this.initialized) {
      throw new Error("Processor not initialized");
    }

    // Get or configure WebGPU context
    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new Error(
        "Failed to get WebGPU context from canvas. Make sure the canvas supports WebGPU.",
      );
    }

    // Configure canvas to use the same device
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device: this.root!.device,
      format: canvasFormat,
    });

    // Set canvas size to match texture
    canvas.width = result.width;
    canvas.height = result.height;

    // Get the current texture from the canvas
    const canvasTexture = context.getCurrentTexture();

    // Use a render pass to copy the texture (handles format conversion)
    // The canvas format (BGRA8Unorm) may differ from our texture format (RGBA8Unorm)
    const encoder = this.root!.device.createCommandEncoder();

    // Create a simple render pass that blits the texture
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: canvasTexture.createView(),
          loadOp: "clear",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          storeOp: "store",
        },
      ],
    });

    // Create a simple blit pipeline on the fly
    // We'll use a fullscreen quad shader to sample and render the texture
    const blitShaderModule = this.root!.device.createShaderModule({
      code: `
        struct VertexOutput {
          @builtin(position) position: vec4<f32>,
          @location(0) uv: vec2<f32>,
        };

        @vertex
        fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
          var output: VertexOutput;
          // Fullscreen triangle
          let x = f32((vertexIndex << 1u) & 2u) * 2.0 - 1.0;
          let y = f32(vertexIndex & 2u) * 2.0 - 1.0;
          output.position = vec4<f32>(x, y, 0.0, 1.0);
          output.uv = vec2<f32>(x * 0.5 + 0.5, 1.0 - (y * 0.5 + 0.5));
          return output;
        }

        @group(0) @binding(0) var inputTexture: texture_2d<f32>;
        @group(0) @binding(1) var inputSampler: sampler;

        @fragment
        fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
          return textureSample(inputTexture, inputSampler, input.uv);
        }
      `,
    });

    const blitBindGroupLayout = this.root!.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            sampleType: "float",
            viewDimension: "2d",
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {
            type: "filtering",
          },
        },
      ],
    });

    const blitPipeline = this.root!.device.createRenderPipeline({
      layout: this.root!.device.createPipelineLayout({
        bindGroupLayouts: [blitBindGroupLayout],
      }),
      vertex: {
        module: blitShaderModule,
        entryPoint: "vs_main",
      },
      fragment: {
        module: blitShaderModule,
        entryPoint: "fs_main",
        targets: [
          {
            format: canvasFormat,
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
    });

    const sampler = this.root!.device.createSampler({
      magFilter: "nearest",
      minFilter: "nearest",
    });

    const blitBindGroup = this.root!.device.createBindGroup({
      layout: blitBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: result.texture.createView(),
        },
        {
          binding: 1,
          resource: sampler,
        },
      ],
    });

    renderPass.setPipeline(blitPipeline);
    renderPass.setBindGroup(0, blitBindGroup);
    renderPass.draw(3, 1, 0, 0);
    renderPass.end();

    this.root!.device.queue.submit([encoder.finish()]);
  }

  /**
   * Clean up GPU resources
   * Call this when done with the processor to free GPU memory
   */
  destroy(): void {
    // Note: GPUTexture objects returned from process() should be destroyed
    // by the caller when no longer needed
    this.root = null;
    this.format = null;
    this.bindGroupLayout = null;
    this.computePipeline = null;
    this.initialized = false;
  }
}

// Re-export types
export type { ProcessResult, AdapterOptions, ImageInput } from "./types.js";
