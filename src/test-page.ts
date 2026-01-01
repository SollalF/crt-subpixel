import { CrtSubpixelProcessor } from "./index.js";

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

// Single unified processor for both images and camera
let processor: CrtSubpixelProcessor | null = null;
let currentImageBitmap: ImageBitmap | null = null;

// Mode tracking
type Mode = "image" | "camera";
let currentMode: Mode = "image";

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
const cameraButton = document.getElementById(
  "camera-button",
) as HTMLButtonElement;
const imageControls = document.getElementById(
  "image-controls",
) as HTMLDivElement;
const orientationSelect = document.getElementById(
  "orientation-select",
) as HTMLSelectElement;
const densitySlider = document.getElementById(
  "density-slider",
) as HTMLInputElement;
const densityValue = document.getElementById(
  "density-value",
) as HTMLSpanElement;
const exportButton = document.getElementById(
  "export-button",
) as HTMLButtonElement;
const exportControl = document.getElementById(
  "export-control",
) as HTMLDivElement;

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

// Initialize processor if needed
async function ensureProcessor(): Promise<CrtSubpixelProcessor> {
  if (!processor) {
    setStatus("Initializing processor...", "info");
    processor = new CrtSubpixelProcessor();
    await processor.init();
    setStatus("Processor initialized successfully", "success");
  }
  return processor;
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

// Switch to image mode
function switchToImageMode() {
  if (currentMode === "image") return;

  // Stop camera if running
  if (processor?.isCameraRunning()) {
    processor.stopCamera();
  }

  currentMode = "image";
  cameraButton.textContent = "Start Camera";
  cameraButton.classList.remove("active");
  imageControls.classList.remove("hidden");
  exportControl.style.display = "none";
  setStatus("Ready. Select an image to process.", "info");
}

// Switch to camera mode
async function toggleCameraMode() {
  // If camera is running, stop it
  if (processor?.isCameraRunning()) {
    switchToImageMode();
    return;
  }

  currentMode = "camera";
  imageControls.classList.add("hidden");
  cameraButton.textContent = "Stop Camera";
  cameraButton.classList.add("active");
  downloadButton.disabled = true;
  exportControl.style.display = "flex";

  try {
    const proc = await ensureProcessor();
    setStatus("Starting camera...", "info");
    await proc.startCamera(canvas);
    setStatus(
      "Camera running. CRT subpixel effect applied in real-time.",
      "success",
    );
  } catch (error) {
    setStatus(
      `Failed to start camera: ${error instanceof Error ? error.message : String(error)}`,
      "error",
    );
    switchToImageMode();
  }
}

// Process and render image
async function processAndRender(imageBitmap: ImageBitmap, saveImage = true) {
  // Make sure we're in image mode (stops camera if running)
  if (currentMode !== "image") {
    switchToImageMode();
  }

  try {
    const proc = await ensureProcessor();

    setStatus("Processing image...", "info");

    // Store the image bitmap for potential reprocessing (e.g., orientation change)
    if (saveImage) {
      currentImageBitmap = imageBitmap;
    }

    // Disable download button while processing
    downloadButton.disabled = true;

    // Render image directly to canvas (unified flow)
    await proc.renderImage(canvas, imageBitmap);

    // Enable download button
    downloadButton.disabled = false;

    // Get canvas dimensions for status message
    setStatus(
      `Image processed successfully. Output size: ${canvas.width}x${canvas.height}`,
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

// Handle camera button click
cameraButton.addEventListener("click", toggleCameraMode);

// Handle export button click (camera mode)
exportButton.addEventListener("click", async () => {
  if (!processor?.isCameraRunning()) {
    setStatus("Camera is not running", "error");
    return;
  }

  try {
    setStatus("Exporting frame...", "info");
    const blob = await processor.exportCameraFrame("image/png");

    if (!blob) {
      setStatus("Failed to export frame", "error");
      return;
    }

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crt-frame-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setStatus("Frame exported!", "success");
  } catch (error) {
    setStatus(
      `Failed to export frame: ${error instanceof Error ? error.message : String(error)}`,
      "error",
    );
  }
});

// Handle orientation change
orientationSelect.addEventListener("change", async (e) => {
  const orientation = (e.target as HTMLSelectElement).value as
    | "columns"
    | "rows";

  if (processor) {
    processor.setOrientation(orientation);

    // For image mode, reprocess the current image with new orientation
    if (currentMode === "image" && currentImageBitmap) {
      await processAndRender(currentImageBitmap, false);
    }
    // For camera mode, the change takes effect on the next frame automatically
  }
});

// Handle pixel density change
densitySlider.addEventListener("input", async (e) => {
  const density = parseInt((e.target as HTMLInputElement).value, 10);
  densityValue.textContent = String(density);

  if (processor) {
    processor.setPixelDensity(density);

    // For image mode, reprocess the current image with new density
    if (currentMode === "image" && currentImageBitmap) {
      await processAndRender(currentImageBitmap, false);
    }
    // For camera mode, the change takes effect on the next frame automatically
  }
});

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
  if (!processor) {
    setStatus("No image to download", "error");
    return;
  }

  try {
    setStatus("Exporting image...", "info");

    // For image mode, use exportImage with the current bitmap
    if (currentMode === "image" && currentImageBitmap) {
      const blob = await processor.exportImage(currentImageBitmap, "image/png");

      if (!blob) {
        setStatus("Failed to export image", "error");
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
    } else {
      setStatus("No image to download", "error");
    }
  } catch (error) {
    setStatus(
      `Failed to download image: ${error instanceof Error ? error.message : String(error)}`,
      "error",
    );
  }
}

// Handle download button click
downloadButton.addEventListener("click", downloadImage);

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (processor) {
    processor.destroy();
  }
});

// Initialize on page load
setStatus("Ready. Select an image to process or start the camera.", "info");
