/**
 * Basic usage example and test
 *
 * This example demonstrates processing a 1x1 white pixel
 * and validates that the output is a 3x3 grid with RGB stripes
 */

import { CrtSubpixelProcessor } from "../index.js";

/**
 * Example: Process a 1x1 white pixel
 * Expected output: 3x3 image with red, green, blue vertical stripes
 */
export async function exampleBasic(): Promise<void> {
  console.log("Initializing CRT Subpixel Processor...");

  const processor = new CrtSubpixelProcessor();
  await processor.init();

  console.log("Creating 1x1 white pixel...");
  // Create a 1x1 white pixel
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context");
  }
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 1, 1);

  const imageBitmap = await createImageBitmap(canvas);

  console.log("Processing image...");
  const result = await processor.process(imageBitmap);

  console.log(
    `Output dimensions: ${result.width}x${result.height} (expected: 3x3)`,
  );

  // Read back the result
  const imageData = await processor.readbackImageData(result);

  console.log("Validating output...");
  validateOutput(imageData, result.width, result.height);

  // Clean up
  result.texture.destroy();
  processor.destroy();

  console.log("Example completed successfully!");
}

/**
 * Validate that the output matches expected pattern:
 * - 3x3 grid
 * - Column 0: Red stripe (R=255, G=0, B=0)
 * - Column 1: Green stripe (R=0, G=255, B=0)
 * - Column 2: Blue stripe (R=0, G=0, B=255)
 */
function validateOutput(
  imageData: ImageData,
  width: number,
  height: number,
): void {
  if (width !== 3 || height !== 3) {
    throw new Error(`Expected 3x3 output, got ${width}x${height}`);
  }

  const data = imageData.data;

  // Check each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx]!;
      const g = data[idx + 1]!;
      const b = data[idx + 2]!;
      const a = data[idx + 3]!;

      // Alpha should be 255 (white input)
      if (a !== 255) {
        throw new Error(`Pixel at (${x}, ${y}): Expected alpha=255, got ${a}`);
      }

      // Check RGB based on column
      if (x === 0) {
        // Red stripe: R should be 255, G and B should be 0
        if (r !== 255 || g !== 0 || b !== 0) {
          throw new Error(
            `Pixel at (${x}, ${y}): Expected RGB(255,0,0), got RGB(${r},${g},${b})`,
          );
        }
      } else if (x === 1) {
        // Green stripe: G should be 255, R and B should be 0
        if (r !== 0 || g !== 255 || b !== 0) {
          throw new Error(
            `Pixel at (${x}, ${y}): Expected RGB(0,255,0), got RGB(${r},${g},${b})`,
          );
        }
      } else {
        // Blue stripe: B should be 255, R and G should be 0
        if (r !== 0 || g !== 0 || b !== 255) {
          throw new Error(
            `Pixel at (${x}, ${y}): Expected RGB(0,0,255), got RGB(${r},${g},${b})`,
          );
        }
      }
    }
  }

  console.log("✓ Output validation passed!");
  console.log("  - Column 0: Red stripes (RGB 255,0,0)");
  console.log("  - Column 1: Green stripes (RGB 0,255,0)");
  console.log("  - Column 2: Blue stripes (RGB 0,0,255)");
}
