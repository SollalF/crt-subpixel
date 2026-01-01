/**
 * CRT Subpixel Processing Library
 *
 * A WebGPU-based library for expanding images into CRT-style subpixel patterns.
 * Each input pixel is expanded into a 3x3 block with vertical RGB stripes.
 *
 * Supports both static images and real-time camera input.
 * Both render directly to canvas and use canvas.toBlob() for export.
 *
 * Browser Support: Chrome/Edge desktop (requires secure context)
 */

import tgpu, {
  type TgpuRoot,
  type TgpuUniform,
  type TgpuRenderPipeline,
} from "typegpu";
import * as d from "typegpu/data";
import { fullScreenTriangle } from "typegpu/common";
import {
  requestCamera,
  type CameraOptions,
  type CameraStream,
} from "./utils/camera.js";

// Import fragment shader
import {
  createSubpixelFragment,
  bindGroupLayout,
} from "./shaders/subpixel-fragment.js";

/**
 * Main processor class for CRT subpixel expansion
 *
 * Supports both static image processing and real-time camera input.
 * Both modes render directly to canvas and use canvas.toBlob() for export.
 *
 * @example
 * ```typescript
 * const processor = new CrtSubpixelProcessor();
 * await processor.init();
 *
 * // Static image processing
 * await processor.renderImage(canvas, imageBitmap);
 * const blob = await processor.exportFrame();
 *
 * // Camera mode
 * await processor.startCamera(canvas);
 * const frameBlob = await processor.exportFrame();
 * processor.stopCamera();
 *
 * processor.destroy();
 * ```
 */
export class CrtSubpixelProcessor {
  private root: TgpuRoot | null = null;
  private initialized = false;

  // Shared resources
  private sampler: ReturnType<TgpuRoot["~unstable"]["createSampler"]> | null =
    null;
  private outputDimensionsBuffer: TgpuUniform<d.Vec2u> | null = null;
  private inputDimensionsBuffer: TgpuUniform<d.Vec2u> | null = null;
  private orientationBuffer: TgpuUniform<d.U32> | null = null;
  private pixelDensityBuffer: TgpuUniform<d.U32> | null = null;
  private currentPixelDensity = 1;

  // Single unified pipeline using external textures for both images and camera
  // Images are converted to VideoFrame to use the same external texture path
  private pipeline: TgpuRenderPipeline | null = null;
  private presentationFormat: GPUTextureFormat | null = null;

  // Current canvas and context (shared between image and camera modes)
  private currentCanvas: HTMLCanvasElement | null = null;
  private currentContext: GPUCanvasContext | null = null;

  // Camera-specific state
  private cameraStream: CameraStream | null = null;
  private videoFrameCallbackId: number | undefined;
  private lastFrameSize: { width: number; height: number } | null = null;

  // Pending export request (resolved after render completes)
  private pendingExport: {
    resolve: (blob: Blob | null) => void;
    type: string;
    quality: number | undefined;
  } | null = null;

  /**
   * Initialize GPU device and compile shaders
   * Must be called before processing any images or starting camera
   *
   * @throws Error if GPU is not supported or initialization fails
   */
  async init(): Promise<void> {
    if (this.initialized) {
      console.log("Processor already initialized");
      return;
    }

    // TypeGPU handles WebGPU initialization and error checking
    this.root = await tgpu.init();

    // Handle device loss through TypeGPU's device access
    this.root.device.lost.then((info) => {
      console.error(`GPU device was lost: ${info.message}`);
    });

    console.log("GPU device initialized");

    // Create shared sampler for texture sampling
    this.sampler = this.root["~unstable"].createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });

    // Create shared uniform buffer for output dimensions
    this.outputDimensionsBuffer = this.root.createUniform(
      d.vec2u,
      d.vec2u(1, 1),
    );

    // Create orientation uniform buffer (0 = columns/vertical, 1 = rows/horizontal)
    this.orientationBuffer = this.root.createUniform(d.u32, 0);

    // Create pixel density uniform buffer (1 = normal, higher = chunkier pixels)
    this.pixelDensityBuffer = this.root.createUniform(
      d.u32,
      this.currentPixelDensity,
    );

    // Create input dimensions uniform buffer (actual input texture size)
    this.inputDimensionsBuffer = this.root.createUniform(
      d.vec2u,
      d.vec2u(1, 1),
    );

    // Create unified pipeline (renders directly to canvas)
    // Uses external textures for both images (via VideoFrame) and camera
    this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    const fragmentFn = createSubpixelFragment(
      this.sampler,
      this.outputDimensionsBuffer,
      this.inputDimensionsBuffer,
      this.orientationBuffer,
      this.pixelDensityBuffer,
    );
    this.pipeline = this.root["~unstable"]
      .withVertex(fullScreenTriangle, {})
      .withFragment(fragmentFn, { format: this.presentationFormat })
      .createPipeline();

    console.log("Pipeline created successfully");

    this.initialized = true;
  }

  // ============================================
  // Image Rendering
  // ============================================

  /**
   * Render an image with CRT subpixel effect directly to canvas
   *
   * @param canvas Target canvas element for rendering
   * @param input Image to process (ImageBitmap - JPEG/PNG formats)
   * @throws Error if not initialized or rendering fails
   */
  async renderImage(
    canvas: HTMLCanvasElement,
    input: ImageBitmap,
  ): Promise<void> {
    if (
      !this.initialized ||
      !this.root ||
      !this.pipeline ||
      !this.outputDimensionsBuffer ||
      !this.inputDimensionsBuffer ||
      !this.presentationFormat
    ) {
      throw new Error(
        "Processor not initialized. Call init() before rendering images.",
      );
    }

    // Stop camera if running (switching to image mode)
    if (this.isCameraRunning()) {
      this.stopCamera();
    }

    // Configure canvas context
    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new Error("Failed to get WebGPU context from canvas");
    }

    this.currentCanvas = canvas;
    this.currentContext = context;

    context.configure({
      device: this.root.device,
      format: this.presentationFormat,
      alphaMode: "premultiplied",
    });

    // Set canvas size (3x input for full detail)
    const canvasWidth = Math.floor(input.width * 3);
    const canvasHeight = Math.floor(input.height * 3);
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Render the image using shared method
    await this.renderImageToCanvas(input);

    // Update canvas aspect ratio
    const aspectRatio = input.width / input.height;
    canvas.style.aspectRatio = `${aspectRatio}`;

    // Calculate output dimensions for logging
    const logicalWidth = input.width / this.currentPixelDensity;
    const logicalHeight = input.height / this.currentPixelDensity;
    const outputWidth = Math.floor(logicalWidth * 3);
    const outputHeight = Math.floor(logicalHeight * 3);

    console.log(
      `Image rendered: ${canvasWidth}x${canvasHeight}, logical pixels ${outputWidth}x${outputHeight}`,
    );
  }

  // ============================================
  // Camera Processing
  // ============================================

  /**
   * Start camera and begin rendering CRT effect to canvas in real-time
   *
   * @param canvas Target canvas element for rendering
   * @param options Camera options (resolution, facing mode, etc.)
   * @throws Error if not initialized or camera access fails
   */
  async startCamera(
    canvas: HTMLCanvasElement,
    options?: CameraOptions,
  ): Promise<void> {
    if (
      !this.initialized ||
      !this.root ||
      !this.pipeline ||
      !this.presentationFormat
    ) {
      throw new Error("Processor not initialized. Call init() first.");
    }

    // Stop existing camera if running
    this.stopCamera();

    this.currentCanvas = canvas;

    // Configure canvas context
    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new Error("Failed to get WebGPU context from canvas");
    }
    this.currentContext = context;

    context.configure({
      device: this.root.device,
      format: this.presentationFormat,
      alphaMode: "premultiplied",
    });

    // Request camera access
    this.cameraStream = await requestCamera(options);

    // Append video element to DOM (required for some browsers)
    document.body.appendChild(this.cameraStream.video);

    // Start render loop
    this.videoFrameCallbackId =
      this.cameraStream.video.requestVideoFrameCallback(
        this.processVideoFrame.bind(this),
      );

    console.log("Camera started");
  }

  /**
   * Stop camera and clean up camera resources
   * Note: This does not clear currentCanvas/currentContext as they may be used for image mode
   */
  stopCamera(): void {
    if (this.videoFrameCallbackId !== undefined && this.cameraStream) {
      this.cameraStream.video.cancelVideoFrameCallback(
        this.videoFrameCallbackId,
      );
      this.videoFrameCallbackId = undefined;
    }

    if (this.cameraStream) {
      this.cameraStream.stop();
      this.cameraStream = null;
    }

    this.lastFrameSize = null;

    // Resolve any pending camera export with null
    if (this.pendingExport) {
      this.pendingExport.resolve(null);
      this.pendingExport = null;
    }

    console.log("Camera stopped");
  }

  /**
   * Check if camera is currently running
   */
  isCameraRunning(): boolean {
    return this.cameraStream !== null;
  }

  /**
   * Export the current camera frame as an image blob
   *
   * Only works in camera mode - captures after the next render.
   * For image mode, use exportImage() instead.
   *
   * @param type Image MIME type (e.g., 'image/png', 'image/jpeg')
   * @param quality For lossy formats like JPEG, quality from 0 to 1
   * @returns Promise resolving to the image Blob, or null if camera is not running
   */
  async exportCameraFrame(
    type: string = "image/png",
    quality?: number,
  ): Promise<Blob | null> {
    if (!this.currentCanvas) {
      console.warn("No canvas is active, cannot export frame");
      return null;
    }

    if (!this.isCameraRunning()) {
      console.warn(
        "Camera is not running, use exportImage() for static images",
      );
      return null;
    }

    return new Promise((resolve) => {
      this.pendingExport = { resolve, type, quality };
    });
  }

  /**
   * Export an image by re-running the render pipeline and capturing the result
   * This is needed because WebGPU clears the canvas after each frame is presented
   *
   * @param input The ImageBitmap to render and export
   * @param type Image MIME type (e.g., 'image/png', 'image/jpeg')
   * @param quality For lossy formats like JPEG, quality from 0 to 1
   * @returns Promise resolving to the image Blob, or null if export fails
   */
  async exportImage(
    input: ImageBitmap,
    type: string = "image/png",
    quality?: number,
  ): Promise<Blob | null> {
    if (
      !this.initialized ||
      !this.root ||
      !this.pipeline ||
      !this.outputDimensionsBuffer ||
      !this.inputDimensionsBuffer ||
      !this.presentationFormat ||
      !this.currentCanvas ||
      !this.currentContext
    ) {
      console.warn(
        "Cannot export: processor not ready or no canvas configured",
      );
      return null;
    }

    // Update input dimensions uniform
    this.inputDimensionsBuffer.write(d.vec2u(input.width, input.height));

    // Calculate output dimensions (3x expansion adjusted for pixel density)
    const logicalWidth = input.width / this.currentPixelDensity;
    const logicalHeight = input.height / this.currentPixelDensity;
    const outputWidth = Math.floor(logicalWidth * 3);
    const outputHeight = Math.floor(logicalHeight * 3);

    // Update output dimensions uniform
    this.outputDimensionsBuffer.write(d.vec2u(outputWidth, outputHeight));

    // Convert ImageBitmap to VideoFrame for use with external texture
    const videoFrame = new VideoFrame(input, { timestamp: 0 });

    // Create bind group with external texture from VideoFrame
    const gpuExternalTexture = this.root.createBindGroup(bindGroupLayout, {
      externalTexture: this.root.device.importExternalTexture({
        source: videoFrame,
      }),
    });

    // Render directly to canvas
    this.pipeline
      .with(gpuExternalTexture)
      .withColorAttachment({
        view: this.currentContext.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        storeOp: "store",
      })
      .draw(3);

    // CRITICAL: Call toBlob synchronously right after draw, before any await
    // This ensures the canvas content is captured before the frame is presented
    // and before any async gap that could invalidate the back buffer
    const blobPromise = new Promise<Blob | null>((resolve) => {
      this.currentCanvas!.toBlob((blob) => resolve(blob), type, quality);
    });

    // Now wait for GPU completion and clean up
    await this.root.device.queue.onSubmittedWorkDone();
    videoFrame.close();

    return blobPromise;
  }

  /**
   * Internal method to render an image to the current canvas
   * Shared between renderImage and exportImage to avoid code duplication
   */
  private async renderImageToCanvas(input: ImageBitmap): Promise<void> {
    if (
      !this.root ||
      !this.pipeline ||
      !this.outputDimensionsBuffer ||
      !this.inputDimensionsBuffer ||
      !this.currentCanvas ||
      !this.currentContext
    ) {
      throw new Error("Processor not ready for rendering");
    }

    // Update input dimensions uniform
    this.inputDimensionsBuffer.write(d.vec2u(input.width, input.height));

    // Calculate output dimensions (3x expansion adjusted for pixel density)
    const logicalWidth = input.width / this.currentPixelDensity;
    const logicalHeight = input.height / this.currentPixelDensity;
    const outputWidth = Math.floor(logicalWidth * 3);
    const outputHeight = Math.floor(logicalHeight * 3);

    // Update output dimensions uniform
    this.outputDimensionsBuffer.write(d.vec2u(outputWidth, outputHeight));

    // Convert ImageBitmap to VideoFrame for use with external texture
    const videoFrame = new VideoFrame(input, { timestamp: 0 });

    // Create bind group with external texture from VideoFrame
    const gpuExternalTexture = this.root.createBindGroup(bindGroupLayout, {
      externalTexture: this.root.device.importExternalTexture({
        source: videoFrame,
      }),
    });

    // Render directly to canvas
    this.pipeline
      .with(gpuExternalTexture)
      .withColorAttachment({
        view: this.currentContext.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        storeOp: "store",
      })
      .draw(3);

    // Wait for GPU to finish rendering
    await this.root.device.queue.onSubmittedWorkDone();

    // Clean up VideoFrame
    videoFrame.close();
  }

  /**
   * Set the RGB stripe orientation
   *
   * @param mode 'columns' for vertical stripes, 'rows' for horizontal stripes
   */
  setOrientation(mode: "columns" | "rows"): void {
    if (!this.orientationBuffer) {
      console.warn(
        "Processor not initialized, orientation will be set on init",
      );
      return;
    }
    this.orientationBuffer.write(mode === "rows" ? 1 : 0);
  }

  /**
   * Get the current RGB stripe orientation
   */
  getOrientation(): "columns" | "rows" {
    // Default to columns if not initialized
    return "columns";
  }

  /**
   * Set the pixel density for chunky pixel effect
   *
   * @param density Number of input pixels to treat as one logical pixel (1 = normal, 2+ = chunkier)
   */
  setPixelDensity(density: number): void {
    const clampedDensity = Math.max(1, Math.floor(density));
    this.currentPixelDensity = clampedDensity;
    if (this.pixelDensityBuffer) {
      this.pixelDensityBuffer.write(clampedDensity);
    }

    // If camera is running, update canvas size to match new density
    // Canvas size = (input / density) * 3, so it changes when density changes
    if (this.isCameraRunning() && this.lastFrameSize) {
      this.updateCanvasSize(
        this.lastFrameSize.width,
        this.lastFrameSize.height,
      );
    }
  }

  /**
   * Get the current pixel density
   */
  getPixelDensity(): number {
    return this.currentPixelDensity;
  }

  /**
   * Process a video frame and render to canvas
   */
  private processVideoFrame(
    _now: number,
    metadata: VideoFrameCallbackMetadata,
  ): void {
    if (
      !this.root ||
      !this.currentContext ||
      !this.currentCanvas ||
      !this.cameraStream ||
      !this.pipeline ||
      !this.outputDimensionsBuffer
    ) {
      return;
    }

    const video = this.cameraStream.video;

    // Wait for video to be ready
    if (video.readyState < 2) {
      this.videoFrameCallbackId = video.requestVideoFrameCallback(
        this.processVideoFrame.bind(this),
      );
      return;
    }

    const frameWidth = metadata.width;
    const frameHeight = metadata.height;

    // Update input dimensions uniform with actual video frame size
    if (this.inputDimensionsBuffer) {
      this.inputDimensionsBuffer.write(d.vec2u(frameWidth, frameHeight));
    }

    // Update canvas size if frame size changed
    if (
      !this.lastFrameSize ||
      this.lastFrameSize.width !== frameWidth ||
      this.lastFrameSize.height !== frameHeight
    ) {
      this.lastFrameSize = { width: frameWidth, height: frameHeight };
      this.updateCanvasSize(frameWidth, frameHeight);
    }

    // Create bind group with external texture (must be done each frame)
    const externalTexture = this.root.createBindGroup(bindGroupLayout, {
      externalTexture: this.root.device.importExternalTexture({
        source: video,
      }),
    });

    // Render to canvas
    this.pipeline
      .with(externalTexture)
      .withColorAttachment({
        view: this.currentContext.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        storeOp: "store",
      })
      .draw(3);

    // Handle pending export request (capture immediately after render)
    if (this.pendingExport && this.currentCanvas) {
      const { resolve, type, quality } = this.pendingExport;
      this.pendingExport = null;

      this.currentCanvas.toBlob((blob) => resolve(blob), type, quality);
    }

    // Schedule next frame
    this.videoFrameCallbackId = video.requestVideoFrameCallback(
      this.processVideoFrame.bind(this),
    );
  }

  /**
   * Update canvas size based on input dimensions
   * Output is 3x the input size for subpixel expansion
   * Canvas size stays constant to show pixelation effect
   */
  private updateCanvasSize(frameWidth: number, frameHeight: number): void {
    if (!this.currentCanvas || !this.outputDimensionsBuffer) {
      return;
    }

    // Canvas size stays constant (3x input) regardless of density
    // This allows us to see the pixelation effect
    const canvasWidth = Math.floor(frameWidth * 3);
    const canvasHeight = Math.floor(frameHeight * 3);

    this.currentCanvas.width = canvasWidth;
    this.currentCanvas.height = canvasHeight;

    // Output dimensions for shader: (input / density) * 3
    // This tells the shader to render fewer pixels, which will be stretched to fill the canvas
    const logicalWidth = frameWidth / this.currentPixelDensity;
    const logicalHeight = frameHeight / this.currentPixelDensity;
    const outputWidth = Math.floor(logicalWidth * 3);
    const outputHeight = Math.floor(logicalHeight * 3);

    // Update dimensions uniform (this controls how many pixels the shader renders)
    this.outputDimensionsBuffer.write(d.vec2u(outputWidth, outputHeight));

    // Update canvas display aspect ratio
    const aspectRatio = frameWidth / frameHeight;
    this.currentCanvas.style.aspectRatio = `${aspectRatio}`;

    console.log(
      `Canvas size: ${canvasWidth}x${canvasHeight}, rendering ${outputWidth}x${outputHeight} pixels`,
    );
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Clean up all GPU resources
   * Call this when done with the processor to free GPU memory
   */
  destroy(): void {
    // Stop camera if running
    this.stopCamera();

    // Clean up GPU resources
    if (this.root) {
      this.root.destroy();
      this.root = null;
    }

    this.sampler = null;
    this.outputDimensionsBuffer = null;
    this.inputDimensionsBuffer = null;
    this.orientationBuffer = null;
    this.pixelDensityBuffer = null;
    this.pipeline = null;
    this.presentationFormat = null;
    this.currentCanvas = null;
    this.currentContext = null;
    this.initialized = false;
  }
}

// Re-export types
export type { CameraOptions } from "./utils/camera.js";
