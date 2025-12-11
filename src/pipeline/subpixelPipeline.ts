/**
 * WebGPU pipeline setup for subpixel processing
 */

import {
  makeBindGroupLayoutDescriptors,
  makeShaderDataDefinitions,
} from "webgpu-utils";
import { subpixelShaderSource } from "../shaders/subpixel.js";

export interface SubpixelPipeline {
  bindGroupLayout: GPUBindGroupLayout;
  computePipeline: GPUComputePipeline;
}

/**
 * Create the compute pipeline for subpixel expansion
 */
export function createSubpixelPipeline(
  device: GPUDevice,
  shaderModule: GPUShaderModule,
): SubpixelPipeline {
  const shaderDefs = makeShaderDataDefinitions(subpixelShaderSource);
  const [group0Descriptor] = makeBindGroupLayoutDescriptors(shaderDefs, {
    compute: { entryPoint: "main" },
  });

  if (!group0Descriptor) {
    throw new Error("Failed to derive bind group layout from shader");
  }

  const bindGroupLayout = device.createBindGroupLayout(group0Descriptor);

  // Pipeline layout
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  // Compute pipeline
  const computePipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: {
      module: shaderModule,
      entryPoint: "main",
    },
  });

  return {
    bindGroupLayout,
    computePipeline,
  };
}

/**
 * Create a bind group for a specific processing operation
 */
export function createBindGroup(
  device: GPUDevice,
  bindGroupLayout: GPUBindGroupLayout,
  inputTexture: GPUTexture,
  outputTexture: GPUTexture,
): GPUBindGroup {
  return device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: inputTexture.createView(),
      },
      {
        binding: 1,
        resource: outputTexture.createView(),
      },
    ],
  });
}
