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

/**
 * TypeGPU compute function for subpixel expansion.
 * Converts each input pixel into a 3x3 block with vertical RGB stripes.
 * The bind group layout defines the texture bindings that will be used
 * when creating the compute pipeline.
 */
export const subpixelComputeFn = tgpu["~unstable"].computeFn({
  in: { global_invocation_id: d.builtin.globalInvocationId },
  workgroupSize: [...WORKGROUP_SIZE],
})(`
  let outputSize = textureDimensions(outputTexture);
  let outputX = global_invocation_id.x;
  let outputY = global_invocation_id.y;

  // Bounds check
  if (outputX >= outputSize.x || outputY >= outputSize.y) {
    return;
  }

  // Map output coordinates back to input pixel coordinates
  // Each input pixel becomes a 3x3 block, so divide by 3
  let inputX = outputX / 3u;
  let inputY = outputY / 3u;

  // Get the position within the 3x3 block (0, 1, or 2)
  let blockX = outputX % 3u;
  let blockY = outputY % 3u;

  // Sample the input pixel
  let inputSize = textureDimensions(inputTexture);
  if (inputX >= inputSize.x || inputY >= inputSize.y) {
    return;
  }

  // Load the input pixel directly (no interpolation needed)
  let inputColor = textureLoad(inputTexture, vec2<i32>(i32(inputX), i32(inputY)), 0);

  // Create the subpixel pattern: vertical RGB stripes
  // blockX = 0 -> Red channel, blockX = 1 -> Green channel, blockX = 2 -> Blue channel
  var outputColor = vec4<f32>(0.0, 0.0, 0.0, inputColor.a);

  if (blockX == 0u) {
    // Red stripe: max out red, zero green and blue
    outputColor.r = inputColor.r;
  } else if (blockX == 1u) {
    // Green stripe: max out green, zero red and blue
    outputColor.g = inputColor.g;
  } else {
    // Blue stripe: max out blue, zero red and green
    outputColor.b = inputColor.b;
  }

  // Write to output texture
  textureStore(outputTexture, vec2<i32>(i32(outputX), i32(outputY)), outputColor);
`);
