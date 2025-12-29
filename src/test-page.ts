import { CrtSubpixelProcessor, type ProcessResult } from "./index.js";

// Test images available in the test-images folder
const TEST_IMAGES = [
  "B2G_gradient.png",
  "B2R_gradient.png",
  "black-1x1.png",
  "blue-1x1.png",
  "branden_128x128.jpeg",
  "branden_512x512.jpeg",
  "chase_64x64.jpeg",
  "G2R_gradient.png",
  "green-1x1.png",
  "R2G_1024x1024_gradient.png",
  "R2G_128x128_gradient.png",
  "R2G_16x16_gradient.png",
  "R2G_256x256_gradient.png",
  "R2G_2x2_gradient.png",
  "R2G_32x32_gradient.png",
  "R2G_4x4_gradient.png",
  "R2G_512x512_gradient.png",
  "R2G_64x64_gradient.png",
  "R2G_8x8_gradient.png",
  "red-1x1.png",
  "white-1x1.png",
];

let processor: CrtSubpixelProcessor | null = null;
let currentResult: ProcessResult | null = null;

// Get DOM elements
const testImageSelect = document.getElementById(
  "test-image-select",
) as HTMLSelectElement;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const statusDiv = document.getElementById("status") as HTMLDivElement;
const canvas = document.getElementById("output-canvas") as HTMLCanvasElement;
const downloadButton = document.getElementById(
  "download-button",
) as HTMLButtonElement;

// Populate test images dropdown
TEST_IMAGES.forEach((imageName) => {
  const option = document.createElement("option");
  option.value = imageName;
  option.textContent = imageName;
  testImageSelect.appendChild(option);
});

// Set status message
function setStatus(
  message: string,
  type: "info" | "error" | "success" = "info",
) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}

// Load image from URL
async function loadImage(url: string): Promise<ImageBitmap> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load image: ${response.statusText}`);
  }
  const blob = await response.blob();
  return createImageBitmap(blob);
}

// Load image from file input
async function loadImageFromFile(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

// Process and render image
async function processAndRender(imageBitmap: ImageBitmap) {
  if (!processor) {
    setStatus("Initializing processor...", "info");
    processor = new CrtSubpixelProcessor();
    try {
      await processor.init();
      setStatus("Processor initialized successfully", "success");
    } catch (error) {
      setStatus(
        `Failed to initialize processor: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      processor = null;
      return;
    }
  }

  try {
    setStatus("Processing image...", "info");

    // Clean up previous result
    if (currentResult) {
      currentResult.texture.destroy();
      currentResult = null;
    }

    // Disable download button while processing
    downloadButton.disabled = true;

    // Process the image
    currentResult = await processor.process(imageBitmap);

    // Render to canvas
    await processor.renderToCanvas(canvas, currentResult);

    // Enable download button
    downloadButton.disabled = false;

    setStatus(
      `Image processed successfully. Output size: ${currentResult.width}x${currentResult.height}`,
      "success",
    );
  } catch (error) {
    // Keep download button disabled on error
    downloadButton.disabled = true;
    setStatus(
      `Processing failed: ${error instanceof Error ? error.message : String(error)}`,
      "error",
    );
  }
}

// Handle test image selection
testImageSelect.addEventListener("change", async (e) => {
  const selectedImage = (e.target as HTMLSelectElement).value;
  if (!selectedImage) {
    return;
  }

  // Clear file input
  fileInput.value = "";

  try {
    setStatus(`Loading ${selectedImage}...`, "info");
    const imageBitmap = await loadImage(`/test-images/${selectedImage}`);
    await processAndRender(imageBitmap);
  } catch (error) {
    setStatus(
      `Failed to load image: ${error instanceof Error ? error.message : String(error)}`,
      "error",
    );
  }
});

// Handle file input selection
fileInput.addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) {
    return;
  }

  // Clear test image selection
  testImageSelect.value = "";

  try {
    setStatus(`Loading ${file.name}...`, "info");
    const imageBitmap = await loadImageFromFile(file);
    await processAndRender(imageBitmap);
  } catch (error) {
    setStatus(
      `Failed to load image: ${error instanceof Error ? error.message : String(error)}`,
      "error",
    );
  }
});

// Download canvas image
async function downloadImage() {
  if (!currentResult || !processor) {
    setStatus("No image to download", "error");
    return;
  }

  try {
    setStatus("Reading image data from GPU...", "info");

    // Read texture back from GPU to ImageData
    const imageData = await processor.readbackImageData(currentResult);

    // Create a temporary 2D canvas to convert ImageData to blob
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) {
      setStatus("Failed to create 2D canvas context", "error");
      return;
    }

    // Draw ImageData to 2D canvas
    ctx.putImageData(imageData, 0, 0);

    // Convert canvas to blob and create download link
    tempCanvas.toBlob((blob) => {
      if (!blob) {
        setStatus("Failed to create image blob", "error");
        return;
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `crt-subpixel-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus("Image downloaded!", "success");
    }, "image/png");
  } catch (error) {
    setStatus(
      `Failed to download image: ${error instanceof Error ? error.message : String(error)}`,
      "error",
    );
  }
}

// Handle download button click
downloadButton.addEventListener("click", downloadImage);

// Initialize on page load
setStatus("Ready. Select an image to process.", "info");
