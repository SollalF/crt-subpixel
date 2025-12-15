import tgpu from "typegpu";
import * as d from "typegpu/data";

/**
 * TypeGPU bind group layout for the subpixel shader.
 * We keep bindings named for clarity:
 * - inputTexture: sampled 2D float texture
 * - outputTexture: writable 2D rgba8 storage texture
 */
export const subpixelBindGroupLayout = tgpu
  .bindGroupLayout({
    inputTexture: { texture: d.texture2d() },
    outputTexture: { storageTexture: d.textureStorage2d("rgba8unorm") },
  })
  .$idx(0);

export const WORKGROUP_SIZE = [8, 8] as const;

let cachedShaderSource: string | null = null;

/**
 * Load the WGSL source from an external file (cached after first load).
 * Uses an absolute path so it works when served from project root.
 */
export async function loadSubpixelShaderSource(): Promise<string> {
  if (cachedShaderSource) return cachedShaderSource;
  const response = await fetch("/src/shaders/subpixel.wgsl");
  if (!response.ok) {
    throw new Error(
      `Failed to load subpixel.wgsl: ${response.status} ${response.statusText}`,
    );
  }
  cachedShaderSource = await response.text();
  return cachedShaderSource;
}
