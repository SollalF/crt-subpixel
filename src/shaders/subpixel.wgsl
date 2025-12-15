/**
 * Compute shader for expanding pixels into CRT subpixel patterns
 * Each input pixel becomes a 3x3 block with vertical RGB stripes
 */

// Input texture binding
@group(0) @binding(0) var inputTexture: texture_2d<f32>;

// Output texture binding
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;

/**
 * Main compute shader entry point
 * Each workgroup processes one output pixel (which corresponds to 1/9th of an input pixel)
 * We dispatch with output dimensions, then map back to input coordinates
 */
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let outputSize = textureDimensions(outputTexture);
  let outputX = globalId.x;
  let outputY = globalId.y;

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
}


