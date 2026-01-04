import { CameraOptions } from "../core/types.js";
import { Dimensions } from "../core/value-objects/Dimensions.js";
import { ICameraManager } from "../core/ports/ICameraManager.js";
/**
 * Camera stream information
 */
export interface CameraStream {
  /** The video element containing the camera stream */
  video: HTMLVideoElement;
  /** The underlying media stream */
  stream: MediaStream;
}
/**
 * Manages camera access and video stream lifecycle
 */
export declare class CameraManager implements ICameraManager {
  private cameraStream;
  /**
   * Check if camera is currently active
   */
  get isActive(): boolean;
  /**
   * Get the video element (if camera is active)
   */
  get video(): HTMLVideoElement | null;
  /**
   * Start camera stream
   * @param options Camera configuration options
   * @throws Error if camera access is denied or unavailable
   */
  start(options?: CameraOptions): Promise<HTMLVideoElement>;
  /**
   * Stop camera and clean up resources
   */
  stop(): void;
  /**
   * Get current video frame dimensions
   * @returns Dimensions or null if camera is not active or not ready
   */
  getFrameDimensions(): Dimensions | null;
  /**
   * Register a video frame callback
   * @param callback Function to call for each video frame
   * @returns Callback ID for cancellation
   */
  requestVideoFrameCallback(callback: VideoFrameRequestCallback): number;
  /**
   * Cancel a video frame callback
   * @param id Callback ID to cancel
   */
  cancelVideoFrameCallback(id: number): void;
}
//# sourceMappingURL=CameraManager.d.ts.map
