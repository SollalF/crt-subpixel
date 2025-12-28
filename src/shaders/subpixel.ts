import tgpu from "typegpu";
import * as d from "typegpu/data";
import * as std from "typegpu/std";

/**
 * TypeGPU bind group layout for the subpixel shader.
 * We keep bindings named for clarity:
 * - inputTexture: sampled 2D rgba8 texture (read-only, can use TypeGPU's write())
 * - sampler: sampler for reading the input texture
 * - outputTexture: writable 2D rgba8 storage texture
 */
export const subpixelBindGroupLayout = tgpu
  .bindGroupLayout({
    inputTexture: { texture: d.texture2d(d.f32) },
    outputTexture: {
      storageTexture: d.textureStorage2d("rgba8unorm", "write-only"),
    },
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
})((input) => {
  // Access textures directly through the bind group layout
  // Get texture dimensions and invocation coordinates
  const outputSize = std.textureDimensions(
    subpixelBindGroupLayout.$.outputTexture,
  );
  const outputX = input.global_invocation_id.x;
  const outputY = input.global_invocation_id.y;

  // Bounds check
  if (outputX >= outputSize.x || outputY >= outputSize.y) {
    return;
  }

  // Map output coordinates back to input pixel coordinates
  // Each input pixel becomes a 3x3 block, so divide by 3
  // Use integer division to get the input pixel coordinate
  const inputX = d.i32(outputX / 3);
  const inputY = d.i32(outputY / 3);

  // Get the position within the 3x3 block (0, 1, or 2)
  const blockX = outputX % 3;

  // Load the input pixel directly using textureLoad (compute shaders can't use textureSample)
  // textureLoad uses integer coordinates, not UV coordinates
  const inputSize = std.textureDimensions(
    subpixelBindGroupLayout.$.inputTexture,
  );

  // Bounds check for input coordinates (convert to u32 for comparison)
  if (d.u32(inputX) >= inputSize.x || d.u32(inputY) >= inputSize.y) {
    return;
  }

  const inputColor = std.textureLoad(
    subpixelBindGroupLayout.$.inputTexture,
    d.vec2i(inputX, inputY),
    0, // mip level
  );

  // Create the subpixel pattern: vertical RGB stripes
  // blockX = 0 -> Red channel, blockX = 1 -> Green channel, blockX = 2 -> Blue channel
  let outputColor = inputColor; // Initialize with input color
  if (blockX === 0) {
    // Red stripe: use red channel, zero green and blue
    outputColor = d.vec4f(inputColor.x, 0.0, 0.0, inputColor.w);
  } else if (blockX === 1) {
    // Green stripe: use green channel, zero red and blue
    outputColor = d.vec4f(0.0, inputColor.y, 0.0, inputColor.w);
  } else {
    // Blue stripe: use blue channel, zero red and green
    outputColor = d.vec4f(0.0, 0.0, inputColor.z, inputColor.w);
  }

  // Write to output texture
  std.textureStore(
    subpixelBindGroupLayout.$.outputTexture,
    d.vec2i(outputX, outputY),
    outputColor,
  );
});
