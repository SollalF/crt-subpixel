/**
 * Camera Processor Use Case
 * Orchestrates real-time camera processing with CRT subpixel effect
 */
import type {
  CameraOptions,
  Dimensions,
  ExportOptions,
} from "../core/types.js";
import type { IGpuContext } from "./ports/IGpuContext.js";
import type { IRenderPipeline } from "./ports/IRenderPipeline.js";
import type { ICanvasManager } from "./ports/ICanvasManager.js";
import type { ICameraManager } from "./ports/ICameraManager.js";
import type { ISettingsManager } from "./ports/ISettingsManager.js";

/**
 * Pending export request state
 */
interface PendingExport {
  resolve: (blob: Blob | null) => void;
  type: string;
  quality: number | undefined;
}

/**
 * Handles real-time camera processing
 */
export class CameraProcessor {
  private videoFrameCallbackId: number | undefined;
  private lastFrameSize: Dimensions | null = null;
  private pendingExport: PendingExport | null = null;

  constructor(
    private gpuContext: IGpuContext,
    private pipeline: IRenderPipeline,
    private canvasManager: ICanvasManager,
    private cameraManager: ICameraManager,
    private settingsManager: ISettingsManager,
  ) {}

  /**
   * Check if camera processing is active
   */
  get isRunning(): boolean {
    return this.cameraManager.isActive;
  }

  /**
   * Calculate output dimensions based on input and pixel density
   */
  private calculateOutputDimensions(input: Dimensions): Dimensions {
    const density = this.settingsManager.pixelDensity;
    const logicalWidth = input.width / density;
    const logicalHeight = input.height / density;

    return {
      width: Math.floor(logicalWidth * 3),
      height: Math.floor(logicalHeight * 3),
    };
  }

  /**
   * Update canvas size for new frame dimensions
   */
  private updateCanvasSize(frameWidth: number, frameHeight: number): void {
    // Set canvas size (3x input)
    this.canvasManager.setSize({ width: frameWidth, height: frameHeight });

    // Calculate output dimensions
    const outputDimensions = this.calculateOutputDimensions({
      width: frameWidth,
      height: frameHeight,
    });

    // Update GPU dimensions
    this.gpuContext.writeOutputDimensions(outputDimensions);

    // Update aspect ratio
    this.canvasManager.setAspectRatio({
      width: frameWidth,
      height: frameHeight,
    });

    const canvas = this.canvasManager.currentCanvas;
    console.log(
      `Canvas size: ${canvas?.width}x${canvas?.height}, rendering ${outputDimensions.width}x${outputDimensions.height} pixels`,
    );
  }

  /**
   * Process a video frame callback
   */
  private processVideoFrame = (
    _now: number,
    metadata: VideoFrameCallbackMetadata,
  ): void => {
    if (
      !this.gpuContext.initialized ||
      !this.pipeline.isCreated ||
      !this.canvasManager.isConfigured ||
      !this.cameraManager.isActive
    ) {
      return;
    }

    const video = this.cameraManager.video;
    if (!video || video.readyState < 2) {
      // Video not ready, schedule next frame
      this.scheduleNextFrame();
      return;
    }

    const frameWidth = metadata.width;
    const frameHeight = metadata.height;

    // Update input dimensions
    this.gpuContext.writeInputDimensions({
      width: frameWidth,
      height: frameHeight,
    });

    // Update canvas if frame size changed
    if (
      !this.lastFrameSize ||
      this.lastFrameSize.width !== frameWidth ||
      this.lastFrameSize.height !== frameHeight
    ) {
      this.lastFrameSize = { width: frameWidth, height: frameHeight };
      this.updateCanvasSize(frameWidth, frameHeight);
    }

    // Render frame
    this.pipeline.render(video, this.canvasManager.getCurrentTextureView());

    // Handle pending export
    if (this.pendingExport) {
      const { resolve, type, quality } = this.pendingExport;
      this.pendingExport = null;
      this.canvasManager.toBlobSync(type, quality).then(resolve);
    }

    // Schedule next frame
    this.scheduleNextFrame();
  };

  /**
   * Schedule the next frame callback
   */
  private scheduleNextFrame(): void {
    if (this.cameraManager.isActive) {
      this.videoFrameCallbackId = this.cameraManager.requestVideoFrameCallback(
        this.processVideoFrame,
      );
    }
  }

  /**
   * Start camera and begin rendering to canvas
   * @param canvas Target canvas for rendering
   * @param options Camera configuration options
   */
  async start(
    canvas: HTMLCanvasElement,
    options?: CameraOptions,
  ): Promise<void> {
    if (!this.gpuContext.initialized || !this.pipeline.isCreated) {
      throw new Error("Processor not initialized");
    }

    // Stop existing camera if running
    this.stop();

    // Configure canvas
    this.canvasManager.configure(canvas, this.gpuContext);

    // Start camera
    await this.cameraManager.start(options);

    // Start render loop
    this.scheduleNextFrame();

    console.log("Camera processing started");
  }

  /**
   * Stop camera processing
   */
  stop(): void {
    // Cancel pending frame callback
    if (this.videoFrameCallbackId !== undefined) {
      this.cameraManager.cancelVideoFrameCallback(this.videoFrameCallbackId);
      this.videoFrameCallbackId = undefined;
    }

    // Stop camera
    this.cameraManager.stop();

    // Reset state
    this.lastFrameSize = null;

    // Resolve pending export with null
    if (this.pendingExport) {
      this.pendingExport.resolve(null);
      this.pendingExport = null;
    }

    console.log("Camera processing stopped");
  }

  /**
   * Export the current camera frame as a Blob
   * @param options Export options (type, quality)
   * @returns Promise resolving to Blob or null if camera not running
   */
  async exportFrame(options: ExportOptions = {}): Promise<Blob | null> {
    if (!this.canvasManager.isConfigured) {
      console.warn("No canvas configured");
      return null;
    }

    if (!this.isRunning) {
      console.warn("Camera is not running");
      return null;
    }

    const type = options.type ?? "image/png";
    const quality = options.quality;

    return new Promise((resolve) => {
      this.pendingExport = { resolve, type, quality };
    });
  }

  /**
   * Notify that pixel density changed (update canvas if running)
   */
  onPixelDensityChanged(): void {
    if (this.isRunning && this.lastFrameSize) {
      this.updateCanvasSize(
        this.lastFrameSize.width,
        this.lastFrameSize.height,
      );
    }
  }
}
