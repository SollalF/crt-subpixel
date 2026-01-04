import { DEFAULT_CAMERA_OPTIONS as m } from "../core/types.js";
import { Dimensions as s } from "../core/value-objects/Dimensions.js";
class l {
  cameraStream = null;
  /**
   * Check if camera is currently active
   */
  get isActive() {
    return this.cameraStream !== null;
  }
  /**
   * Get the video element (if camera is active)
   */
  get video() {
    return this.cameraStream?.video ?? null;
  }
  /**
   * Start camera stream
   * @param options Camera configuration options
   * @throws Error if camera access is denied or unavailable
   */
  async start(a = {}) {
    this.stop();
    const t = { ...m, ...a };
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error("Camera access is not supported in this browser");
    const r = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: t.facingMode,
          width: { ideal: t.width },
          height: { ideal: t.height },
          frameRate: { ideal: t.frameRate },
        },
      }),
      e = document.createElement("video");
    return (
      (e.srcObject = r),
      (e.autoplay = !0),
      (e.playsInline = !0),
      (e.muted = !0),
      (e.style.display = "none"),
      await new Promise((o, i) => {
        ((e.onloadedmetadata = () => {
          e.play()
            .then(() => o())
            .catch(i);
        }),
          (e.onerror = () => i(new Error("Failed to load video stream"))));
      }),
      document.body.appendChild(e),
      (this.cameraStream = { video: e, stream: r }),
      console.log("Camera started"),
      e
    );
  }
  /**
   * Stop camera and clean up resources
   */
  stop() {
    if (!this.cameraStream) return;
    const { video: a, stream: t } = this.cameraStream;
    for (const r of t.getTracks()) r.stop();
    ((a.srcObject = null),
      a.remove(),
      (this.cameraStream = null),
      console.log("Camera stopped"));
  }
  /**
   * Get current video frame dimensions
   * @returns Dimensions or null if camera is not active or not ready
   */
  getFrameDimensions() {
    return !this.cameraStream || this.cameraStream.video.readyState < 2
      ? null
      : new s(
          this.cameraStream.video.videoWidth,
          this.cameraStream.video.videoHeight,
        );
  }
  /**
   * Register a video frame callback
   * @param callback Function to call for each video frame
   * @returns Callback ID for cancellation
   */
  requestVideoFrameCallback(a) {
    if (!this.cameraStream) throw new Error("Camera not active");
    return this.cameraStream.video.requestVideoFrameCallback(a);
  }
  /**
   * Cancel a video frame callback
   * @param id Callback ID to cancel
   */
  cancelVideoFrameCallback(a) {
    this.cameraStream && this.cameraStream.video.cancelVideoFrameCallback(a);
  }
}
export { l as CameraManager };
//# sourceMappingURL=CameraManager.js.map
