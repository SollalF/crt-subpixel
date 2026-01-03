/**
 * Fragment shader for CRT subpixel effect
 * Uses external textures for both images (via VideoFrame) and camera
 */
import tgpu, { type TgpuSampler, type TgpuUniform } from "typegpu";
import * as d from "typegpu/data";
import * as std from "typegpu/std";

/**
 * Bind group layout for the subpixel shader (external texture)
 */
export const bindGroupLayout = tgpu.bindGroupLayout({
  externalTexture: { externalTexture: d.textureExternal() },
});

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
export function createSubpixelFragment(
  sampler: TgpuSampler,
  outputDimensions: TgpuUniform<d.Vec2u>,
  inputDimensions: TgpuUniform<d.Vec2u>,
  orientation: TgpuUniform<d.U32>,
  pixelDensity: TgpuUniform<d.U32>,
  interlaced: TgpuUniform<d.U32>,
  field: TgpuUniform<d.U32>,
) {
  return tgpu["~unstable"].fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })((input) => {
    // Get output pixel coordinate from UV and output dimensions
    const outputDims = outputDimensions.$;
    const pixelCoord = input.uv.mul(d.vec2f(outputDims.x, outputDims.y));

    // Calculate which position in the 3x3 block (0, 1, or 2)
    // Use X for columns (vertical stripes), Y for rows (horizontal stripes)
    const blockX = d.u32(pixelCoord.x) % 3;
    const blockY = d.u32(pixelCoord.y) % 3;
    const blockPos = std.select(blockX, blockY, orientation.$ === 1);

    // Calculate which logical pixel we're in (output / 3)
    const logicalPixelCoord = pixelCoord.div(3);

    // Each logical pixel represents 'density' input pixels
    // Convert logical pixel to input pixel space and sample from center of the group
    const density = d.f32(pixelDensity.$);
    const logicalPixelIndex = std.floor(logicalPixelCoord);

    // Each logical pixel represents a group of 'density' input pixels
    // Sample from the center of that group: logicalPixelIndex * density + density / 2
    const groupedPixel = logicalPixelIndex.mul(density).add(density / 2.0);

    // Use actual input texture dimensions
    const inputDims = d.vec2f(inputDimensions.$.x, inputDimensions.$.y);
    const inputUV = groupedPixel.div(inputDims);

    // Sample the external texture using textureSampleBaseClampToEdge
    const inputColor = std.textureSampleBaseClampToEdge(
      bindGroupLayout.$.externalTexture,
      sampler.$,
      inputUV,
    );

    // Check interlacing: if enabled, skip pixel blocks that don't match the selected field
    // Each logical pixel is 3x3, so we alternate between 3 rows rendered and 3 rows skipped
    const isInterlaced = interlaced.$ === 1;
    if (isInterlaced) {
      const outputY = d.u32(pixelCoord.y);
      // Calculate which logical pixel row we're in (each pixel is 3 rows tall)
      const logicalPixelRow = outputY / 3;
      const logicalPixelRowIndex = d.u32(logicalPixelRow);
      // Determine which field this logical pixel row belongs to (0 or 1)
      const pixelRowField = logicalPixelRowIndex % 2;
      const selectedField = d.u32(field.$); // 0 for even field, 1 for odd field

      // Skip rendering if pixel row field doesn't match selected field
      // Odd field (1): render rows 0-2, 6-8, 12-14... (pixelRowField === 0)
      // Even field (0): render rows 3-5, 9-11, 15-17... (pixelRowField === 1)
      const shouldSkip = pixelRowField !== selectedField;
      if (shouldSkip) {
        // Return transparent/black for skipped pixel rows
        return d.vec4f(0.0, 0.0, 0.0, 1.0);
      }
    }

    // Apply subpixel pattern based on block position
    let outputColor = inputColor;
    if (blockPos === 0) {
      // Red stripe: use red channel only
      outputColor = d.vec4f(inputColor.x, 0.0, 0.0, inputColor.w);
    } else if (blockPos === 1) {
      // Green stripe: use green channel only
      outputColor = d.vec4f(0.0, inputColor.y, 0.0, inputColor.w);
    } else {
      // Blue stripe: use blue channel only
      outputColor = d.vec4f(0.0, 0.0, inputColor.z, inputColor.w);
    }

    return outputColor;
  });
}
