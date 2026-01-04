import { CameraOptions, ExportOptions } from "../core/types.js";
import {
  IGpuContext,
  IRenderPipeline,
  ICanvasManager,
  ICameraManager,
  ISettingsManager,
} from "../core/ports/index.js";
/**
 * Handles real-time camera processing
 */
export declare class CameraProcessor {
  private gpuContext;
  private pipeline;
  private canvasManager;
  private cameraManager;
  private settingsManager;
  private videoFrameCallbackId;
  private lastFrameSize;
  private pendingExport;
  private frameCount;
  private readonly subpixelRenderer;
  constructor(
    gpuContext: IGpuContext,
    pipeline: IRenderPipeline,
    canvasManager: ICanvasManager,
    cameraManager: ICameraManager,
    settingsManager: ISettingsManager,
  );
  /**
   * Check if camera processing is active
   */
  get isRunning(): boolean;
  /**
   * Update canvas size for new frame dimensions
   */
  private updateCanvasSize;
  /**
   * Process a video frame callback
   */
  private processVideoFrame;
  /**
   * Schedule the next frame callback
   */
  private scheduleNextFrame;
  /**
   * Start camera and begin rendering to canvas
   * @param canvas Target canvas for rendering
   * @param options Camera configuration options
   */
  start(canvas: HTMLCanvasElement, options?: CameraOptions): Promise<void>;
  /**
   * Stop camera processing
   */
  stop(): void;
  /**
   * Export the current camera frame as a Blob
   * @param options Export options (type, quality)
   * @returns Promise resolving to Blob or null if camera not running
   */
  exportFrame(options?: ExportOptions): Promise<Blob | null>;
  /**
   * Notify that pixel density changed (update canvas if running)
   */
  onPixelDensityChanged(): void;
}
//# sourceMappingURL=CameraProcessor.d.ts.map
