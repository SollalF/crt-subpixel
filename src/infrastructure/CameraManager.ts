/**
 * Camera Manager
 * Handles camera stream lifecycle and video element management
 */
import { type CameraOptions, DEFAULT_CAMERA_OPTIONS } from "../core/types.js";
import { Dimensions } from "../core/value-objects/Dimensions.js";
import type { ICameraManager } from "../core/repositories/ICameraManager.js";

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
export class CameraManager implements ICameraManager {
  private cameraStream: CameraStream | null = null;

  /**
   * Check if camera is currently active
   */
  get isActive(): boolean {
    return this.cameraStream !== null;
  }

  /**
   * Get the video element (if camera is active)
   */
  get video(): HTMLVideoElement | null {
    return this.cameraStream?.video ?? null;
  }

  /**
   * Start camera stream
   * @param options Camera configuration options
   * @throws Error if camera access is denied or unavailable
   */
  async start(options: CameraOptions = {}): Promise<HTMLVideoElement> {
    // Stop existing camera if running
    this.stop();

    const opts = { ...DEFAULT_CAMERA_OPTIONS, ...options };

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera access is not supported in this browser");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: opts.facingMode,
        width: { ideal: opts.width },
        height: { ideal: opts.height },
        frameRate: { ideal: opts.frameRate },
      },
    });

    // Create video element for the stream
    const video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true; // Required for iOS
    video.muted = true; // Required for autoplay

    // Hide the video element (we render to canvas)
    video.style.display = "none";

    // Wait for video to be ready
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        video
          .play()
          .then(() => resolve())
          .catch(reject);
      };
      video.onerror = () => reject(new Error("Failed to load video stream"));
    });

    // Append video element to DOM (required for some browsers)
    document.body.appendChild(video);

    this.cameraStream = { video, stream };

    console.log("Camera started");
    return video;
  }

  /**
   * Stop camera and clean up resources
   */
  stop(): void {
    if (!this.cameraStream) {
      return;
    }

    const { video, stream } = this.cameraStream;

    // Stop all tracks
    for (const track of stream.getTracks()) {
      track.stop();
    }

    // Clear video source
    video.srcObject = null;

    // Remove from DOM
    video.remove();

    this.cameraStream = null;
    console.log("Camera stopped");
  }

  /**
   * Get current video frame dimensions
   * @returns Dimensions or null if camera is not active or not ready
   */
  getFrameDimensions(): Dimensions | null {
    if (!this.cameraStream || this.cameraStream.video.readyState < 2) {
      return null;
    }

    return new Dimensions(
      this.cameraStream.video.videoWidth,
      this.cameraStream.video.videoHeight,
    );
  }

  /**
   * Register a video frame callback
   * @param callback Function to call for each video frame
   * @returns Callback ID for cancellation
   */
  requestVideoFrameCallback(callback: VideoFrameRequestCallback): number {
    if (!this.cameraStream) {
      throw new Error("Camera not active");
    }
    return this.cameraStream.video.requestVideoFrameCallback(callback);
  }

  /**
   * Cancel a video frame callback
   * @param id Callback ID to cancel
   */
  cancelVideoFrameCallback(id: number): void {
    if (this.cameraStream) {
      this.cameraStream.video.cancelVideoFrameCallback(id);
    }
  }
}
