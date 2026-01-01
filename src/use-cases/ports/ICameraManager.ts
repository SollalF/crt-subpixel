/**
 * Camera Manager Port (Interface)
 * Defines the contract for camera operations required by use cases
 */
import type { CameraOptions, Dimensions } from "../../core/types.js";

/**
 * Interface for camera management operations
 * Use cases depend on this abstraction, not concrete implementations
 */
export interface ICameraManager {
  /** Check if camera is currently active */
  readonly isActive: boolean;

  /** Get the video element (if camera is active) */
  readonly video: HTMLVideoElement | null;

  /** Start camera stream */
  start(options?: CameraOptions): Promise<HTMLVideoElement>;

  /** Stop camera and clean up resources */
  stop(): void;

  /** Get current video frame dimensions */
  getFrameDimensions(): Dimensions | null;

  /** Register a video frame callback */
  requestVideoFrameCallback(callback: VideoFrameRequestCallback): number;

  /** Cancel a video frame callback */
  cancelVideoFrameCallback(id: number): void;
}
