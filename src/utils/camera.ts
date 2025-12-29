/**
 * Camera stream management utilities
 */

export interface CameraOptions {
  /** Preferred camera facing mode */
  facingMode?: "user" | "environment";
  /** Preferred width */
  width?: number;
  /** Preferred height */
  height?: number;
  /** Preferred frame rate */
  frameRate?: number;
}

export interface CameraStream {
  /** The video element containing the camera stream */
  video: HTMLVideoElement;
  /** The underlying media stream */
  stream: MediaStream;
  /** Stop the camera and clean up resources */
  stop: () => void;
}

const DEFAULT_OPTIONS: Required<CameraOptions> = {
  facingMode: "user",
  width: 1280,
  height: 720,
  frameRate: 60,
};

/**
 * Request camera access and create a video element with the stream
 *
 * @param options Camera configuration options
 * @returns CameraStream with video element and cleanup function
 * @throws Error if camera access is denied or unavailable
 */
export async function requestCamera(
  options: CameraOptions = {},
): Promise<CameraStream> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

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

  const stop = () => {
    // Stop all tracks
    for (const track of stream.getTracks()) {
      track.stop();
    }
    // Clear video source
    video.srcObject = null;
    // Remove from DOM if attached
    video.remove();
  };

  return { video, stream, stop };
}
