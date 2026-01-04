import { TgpuSampler, TgpuUniform } from "typegpu";
import * as d from "typegpu/data";
/**
 * Bind group layout for the subpixel shader (external texture)
 */
export declare const bindGroupLayout: import("typegpu").TgpuBindGroupLayout<{
  externalTexture: {
    externalTexture: d.WgslExternalTexture;
  };
}>;
/**
 * Create the subpixel fragment shader
 *
 * Implements a 3x3 RGB stripe pattern:
 * - Each input pixel becomes a 3x3 block
 * - When orientation is 0 (columns): vertical RGB stripes
 *   - Columns 0, 3, 6... show only red channel
 *   - Columns 1, 4, 7... show only green channel
 *   - Columns 2, 5, 8... show only blue channel
 * - When orientation is 1 (rows): horizontal RGB stripes
 *   - Rows 0, 3, 6... show only red channel
 *   - Rows 1, 4, 7... show only green channel
 *   - Rows 2, 5, 8... show only blue channel
 */
export declare function createSubpixelFragment(
  sampler: TgpuSampler,
  outputDimensions: TgpuUniform<d.Vec2u>,
  inputDimensions: TgpuUniform<d.Vec2u>,
  orientation: TgpuUniform<d.U32>,
  pixelDensity: TgpuUniform<d.U32>,
  interlaced: TgpuUniform<d.U32>,
  field: TgpuUniform<d.U32>,
): import("typegpu").TgpuFragmentFn<
  {
    uv: d.Vec2f;
  },
  d.Vec4f
>;
//# sourceMappingURL=subpixel-fragment.d.ts.map
