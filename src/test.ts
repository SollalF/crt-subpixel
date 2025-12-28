import { CrtSubpixelProcessor } from "./index.js";

// Extend Window interface for test utilities
interface WindowWithTestUtils extends Window {
  loadTestImage?: (color: string) => void;
  processImage?: () => Promise<void>;
  clearLog?: () => void;
  process?: { env: Record<string, string | undefined> };
}

// Minimal shim for packages expecting Node's process in the browser
if (typeof (window as WindowWithTestUtils).process === "undefined") {
  (window as WindowWithTestUtils).process = { env: {} };
}

let processor: CrtSubpixelProcessor | null = null;
let currentImage: ImageBitmap | null = null;

const inputCanvas = document.getElementById("inputCanvas") as HTMLCanvasElement;
const outputCanvas = document.getElementById(
  "outputCanvas",
) as HTMLCanvasElement;
const inputCtx = inputCanvas.getContext("2d")!;
// Output canvas will use WebGPU context (no 2D context needed)
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const processBtn = document.getElementById("processBtn") as HTMLButtonElement;

// Visual scale factor for viewing tiny outputs
const OUTPUT_SCALE = 80;

function log(message: string, type: string = "info") {
  const logDiv = document.getElementById("log")!;
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logDiv.appendChild(entry);
  logDiv.scrollTop = logDiv.scrollHeight;
  console.log(message);
}

function clearLog() {
  document.getElementById("log")!.innerHTML = "";
}

function updateInputInfo(width: number, height: number) {
  document.getElementById("inputInfo")!.textContent =
    `${width}x${height} pixels`;
}

function updateOutputInfo(width: number, height: number) {
  document.getElementById("outputInfo")!.textContent =
    `${width}x${height} pixels (3x expansion)`;
}

async function initProcessor() {
  if (processor) return;

  try {
    log("Initializing WebGPU processor...");
    processor = new CrtSubpixelProcessor();
    await processor.init();
    log("Processor initialized successfully", "success");
    processBtn.disabled = false;
  } catch (error) {
    const err = error as Error;
    log(`Initialization failed: ${err.message}`, "error");
    throw error;
  }
}

function debugImageBitmap(bitmap: ImageBitmap, label: string) {
  const tmp = new OffscreenCanvas(bitmap.width, bitmap.height);
  const tmpCtx = tmp.getContext("2d")!;
  tmpCtx.drawImage(bitmap, 0, 0);
  const data = tmpCtx.getImageData(0, 0, bitmap.width, bitmap.height).data;
  log(
    `${label} first pixel RGBA: ${Array.from(data.slice(0, 4))} (size ${bitmap.width}x${bitmap.height})`,
  );
}

async function processCurrentImage() {
  if (!currentImage) {
    return;
  }

  try {
    await initProcessor();

    log("Processing image...");
    const startTime = performance.now();

    const result = await processor!.process(currentImage);

    const endTime = performance.now();
    log(
      `Processing completed in ${(endTime - startTime).toFixed(2)}ms`,
      "success",
    );

    // Render directly to WebGPU canvas (no readback needed!)
    await processor!.renderToCanvas(outputCanvas, result);

    // Scale for visibility while keeping square ratio within panel
    const containerWidth =
      outputCanvas.parentElement?.clientWidth ?? result.width;
    const scale = Math.min(OUTPUT_SCALE, containerWidth / result.width);
    const displayWidth = result.width * scale;
    const displayHeight = result.height * scale;
    outputCanvas.style.width = `${displayWidth}px`;
    outputCanvas.style.height = `${displayHeight}px`;
    outputCanvas.style.maxWidth = "100%";
    outputCanvas.style.maxHeight = "100%";
    updateOutputInfo(result.width, result.height);

    // Optional: Read back for debugging (only if needed)
    // const rawArray = await processor!.readbackUint8Array(result);
    // log(
    //   `GPU readback (${result.width}x${result.height}) RGBA: ${Array.from(rawArray)}`,
    // );

    // Clean up
    result.texture.destroy();

    log(
      `Output: ${result.width}x${result.height} (input was ${currentImage.width}x${currentImage.height})`,
      "success",
    );
  } catch (error) {
    const err = error as Error;
    log(`Processing failed: ${err.message}`, "error");
    console.error(error);
  }
}

function loadTestImage(color: string) {
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);

  createImageBitmap(canvas).then(async (bitmap) => {
    debugImageBitmap(bitmap, `Test ${color}`);
    displayInput(bitmap);
    currentImage = bitmap;
    // Auto-process the image
    await processCurrentImage();
  });
}

function displayInput(image: ImageBitmap) {
  // Scale up for display (100x100)
  inputCanvas.width = Math.max(image.width * 100, 100);
  inputCanvas.height = Math.max(image.height * 100, 100);
  inputCtx.imageSmoothingEnabled = false;
  inputCtx.drawImage(image, 0, 0, inputCanvas.width, inputCanvas.height);
  updateInputInfo(image.width, image.height);
}

fileInput.addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
    });

    const bitmap = await createImageBitmap(img);
    displayInput(bitmap);
    currentImage = bitmap;
    log(`Loaded image: ${file.name} (${bitmap.width}x${bitmap.height})`);
    // Auto-process the image
    await processCurrentImage();
  } catch (error) {
    const err = error as Error;
    log(`Failed to load image: ${err.message}`, "error");
  }
});

(window as WindowWithTestUtils).loadTestImage = loadTestImage;
// Keep processImage function for manual processing if needed
(window as WindowWithTestUtils).processImage = processCurrentImage;

(window as WindowWithTestUtils).clearLog = clearLog;

// Auto-initialize on load
initProcessor().catch(() => {
  log(
    `WebGPU not available. Make sure you're using Chrome/Edge and on localhost or HTTPS.`,
    "error",
  );
});
