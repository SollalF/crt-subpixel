/**
 * CRT Subpixel Processing Library
 *
 * A WebGPU-based library for expanding images into CRT-style subpixel patterns.
 * Each input pixel is expanded into a 3x3 block with vertical RGB stripes.
 *
 * Supports both static images and real-time camera input.
 *
 * Browser Support: Chrome/Edge desktop (requires secure context)
 */

import { processImage } from "./pipeline/process.js";
import { readTextureToImageData } from "./utils/readback.js";
import { renderTextureToCanvas } from "./utils/render.js";
import type { ProcessResult } from "./types.js";
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

// Import fragment shaders
import {
  createImageSubpixelFragment,
  createVideoSubpixelFragment,
  videoBindGroupLayout,
} from "./shaders/subpixel-fragment.js";

/**
 * Main processor class for CRT subpixel expansion
 *
 * Supports both static image processing and real-time camera input.
 *
 * @example
 * ```typescript
 * // Static image processing
 * const processor = new CrtSubpixelProcessor();
 * await processor.init();
 * const result = await processor.process(imageBitmap);
 * await processor.renderToCanvas(canvas, result);
 *
 * // Camera mode
 * await processor.startCamera(canvas);
 * // ... later
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

  // The pipelines for image and camera processing are separate because we load the data different ways
  // Image pipeline uses the texture.write() function from TypeGPU as documented in: https://docs.swmansion.com/TypeGPU/fundamentals/textures/#writing-to-a-texture
  // Camera pipeline uses the underlying WebGPU function root.device.importExternalTexture()
  // to import from the camera feed as show in the examplehttps://docs.swmansion.com/TypeGPU/examples/#example=image-processing--ascii-filter
  // It seems TypeGPU is missing a few functionalities for textures
  // For the moment I'm leaving them as is but ideally if Type GPU implements both, we should update the code to use the new functionality

  // Image processing pipeline
  private imagePipeline: TgpuRenderPipeline | null = null;

  // Camera processing pipeline and state
  private cameraPipeline: TgpuRenderPipeline | null = null;
  private cameraStream: CameraStream | null = null;
  private videoFrameCallbackId: number | undefined;
  private cameraCanvas: HTMLCanvasElement | null = null;
  private cameraContext: GPUCanvasContext | null = null;
  private lastFrameSize: { width: number; height: number } | null = null;

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

    // Create image processing pipeline (for static images)
    const imageFragmentFn = createImageSubpixelFragment(
      this.sampler,
      this.outputDimensionsBuffer,
    );
    this.imagePipeline = this.root["~unstable"]
      .withVertex(fullScreenTriangle, {})
      .withFragment(imageFragmentFn, { format: "rgba8unorm" })
      .createPipeline();

    // Create camera processing pipeline (for video/external textures)
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    const videoFragmentFn = createVideoSubpixelFragment(
      this.sampler,
      this.outputDimensionsBuffer,
    );
    this.cameraPipeline = this.root["~unstable"]
      .withVertex(fullScreenTriangle, {})
      .withFragment(videoFragmentFn, { format: presentationFormat })
      .createPipeline();

    console.log("Pipelines created successfully");

    this.initialized = true;
  }

  // ============================================
  // Static Image Processing
  // ============================================

  /**
   * Process an image and expand it into CRT subpixel pattern
   *
   * @param input Image to process (ImageBitmap - JPEG/PNG formats)
   * @returns Result containing output texture and dimensions (3x input size)
   * @throws Error if not initialized or processing fails
   */
  async process(input: ImageBitmap): Promise<ProcessResult> {
    if (
      !this.initialized ||
      !this.root ||
      !this.imagePipeline ||
      !this.outputDimensionsBuffer
    ) {
      throw new Error(
        "Processor not initialized. Call init() before processing images.",
      );
    }

    // Update output dimensions uniform based on input size
    const outputWidth = input.width * 3;
    const outputHeight = input.height * 3;
    this.outputDimensionsBuffer.write(d.vec2u(outputWidth, outputHeight));

    const result = await processImage(this.root, this.imagePipeline, input);

    return {
      texture: result.texture,
      width: result.width,
      height: result.height,
    };
  }

  /**
   * Read back a processed texture to ImageData
   *
   * @param result Process result from process()
   * @returns ImageData containing the subpixel-expanded image
   */
  async readbackImageData(result: ProcessResult): Promise<ImageData> {
    if (!this.initialized || !this.root) {
      throw new Error("Processor not initialized");
    }

    return readTextureToImageData(
      this.root,
      result.texture,
      result.width,
      result.height,
    );
  }

  /**
   * Render a processed texture directly to a canvas
   * This avoids the need for CPU readback and is much faster
   *
   * @param canvas HTMLCanvasElement with WebGPU context
   * @param result Process result from process()
   * @throws Error if not initialized or canvas context is invalid
   */
  async renderToCanvas(
    canvas: HTMLCanvasElement,
    result: ProcessResult,
  ): Promise<void> {
    if (!this.initialized || !this.root) {
      throw new Error("Processor not initialized");
    }

    return renderTextureToCanvas(this.root, canvas, result);
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
    if (!this.initialized || !this.root || !this.cameraPipeline) {
      throw new Error("Processor not initialized. Call init() first.");
    }

    // Stop existing camera if running
    this.stopCamera();

    this.cameraCanvas = canvas;

    // Configure canvas context
    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new Error("Failed to get WebGPU context from canvas");
    }
    this.cameraContext = context;

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device: this.root.device,
      format: presentationFormat,
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

    this.cameraCanvas = null;
    this.cameraContext = null;
    this.lastFrameSize = null;

    console.log("Camera stopped");
  }

  /**
   * Check if camera is currently running
   */
  isCameraRunning(): boolean {
    return this.cameraStream !== null;
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
      !this.cameraContext ||
      !this.cameraCanvas ||
      !this.cameraStream ||
      !this.cameraPipeline ||
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

    // Update canvas size if frame size changed
    if (
      !this.lastFrameSize ||
      this.lastFrameSize.width !== frameWidth ||
      this.lastFrameSize.height !== frameHeight
    ) {
      this.lastFrameSize = { width: frameWidth, height: frameHeight };
      this.updateCameraCanvasSize(frameWidth, frameHeight);
    }

    // Create bind group with external texture (must be done each frame)
    const bindGroup = this.root.createBindGroup(videoBindGroupLayout, {
      externalTexture: this.root.device.importExternalTexture({
        source: video,
      }),
    });

    // Render to canvas
    this.cameraPipeline
      .with(bindGroup)
      .withColorAttachment({
        view: this.cameraContext.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        storeOp: "store",
      })
      .draw(3);

    // Schedule next frame
    this.videoFrameCallbackId = video.requestVideoFrameCallback(
      this.processVideoFrame.bind(this),
    );
  }

  /**
   * Update canvas size based on video frame dimensions
   * Output is 3x the input size for subpixel expansion
   */
  private updateCameraCanvasSize(
    frameWidth: number,
    frameHeight: number,
  ): void {
    if (!this.cameraCanvas || !this.outputDimensionsBuffer) {
      return;
    }

    // Output is 3x input size
    const outputWidth = frameWidth * 3;
    const outputHeight = frameHeight * 3;

    this.cameraCanvas.width = outputWidth;
    this.cameraCanvas.height = outputHeight;

    // Update dimensions uniform
    this.outputDimensionsBuffer.write(d.vec2u(outputWidth, outputHeight));

    // Update canvas display aspect ratio
    const aspectRatio = frameWidth / frameHeight;
    this.cameraCanvas.style.aspectRatio = `${aspectRatio}`;

    console.log(`Camera canvas resized to ${outputWidth}x${outputHeight}`);
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
    this.imagePipeline = null;
    this.cameraPipeline = null;
    this.initialized = false;
  }
}

// Re-export types
export type { ProcessResult } from "./types.js";
export type { CameraOptions } from "./utils/camera.js";
