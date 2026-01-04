import { DEFAULT_SETTINGS as s } from "../core/types.js";
import { Orientation as e } from "../core/value-objects/Orientation.js";
class h {
  settings;
  gpuContext = null;
  constructor(t = {}) {
    ((this.settings = { ...s }),
      t.orientation !== void 0 &&
        (this.settings.orientation =
          typeof t.orientation == "string"
            ? e.from(t.orientation)
            : t.orientation),
      t.pixelDensity !== void 0 &&
        (this.settings.pixelDensity = t.pixelDensity),
      t.interlaced !== void 0 && (this.settings.interlaced = t.interlaced),
      t.field !== void 0 && (this.settings.field = t.field));
  }
  /**
   * Connect to a GPU context for buffer synchronization
   */
  connect(t) {
    ((this.gpuContext = t), this.syncToGpu());
  }
  /**
   * Disconnect from GPU context
   */
  disconnect() {
    this.gpuContext = null;
  }
  /**
   * Get the current orientation
   */
  get orientation() {
    return this.settings.orientation;
  }
  /**
   * Set the RGB stripe orientation
   */
  set orientation(t) {
    ((this.settings.orientation = t),
      this.gpuContext?.initialized &&
        this.gpuContext.writeOrientation(t.toBoolean()));
  }
  /**
   * Get the current pixel density
   */
  get pixelDensity() {
    return this.settings.pixelDensity;
  }
  /**
   * Set the pixel density for chunky pixel effect
   */
  set pixelDensity(t) {
    const i = Math.max(1, Math.floor(t));
    ((this.settings.pixelDensity = i),
      this.gpuContext?.initialized && this.gpuContext.writePixelDensity(i));
  }
  /**
   * Get the current interlaced mode
   */
  get interlaced() {
    return this.settings.interlaced;
  }
  /**
   * Set interlaced rendering mode
   */
  set interlaced(t) {
    ((this.settings.interlaced = t),
      this.gpuContext?.initialized && this.gpuContext.writeInterlaced(t));
  }
  /**
   * Get the current field selection
   */
  get field() {
    return this.settings.field;
  }
  /**
   * Set field selection for interlaced rendering
   */
  set field(t) {
    ((this.settings.field = t),
      this.gpuContext?.initialized && this.gpuContext.writeField(t === "odd"));
  }
  /**
   * Get a copy of all current settings
   */
  getSettings() {
    return { ...this.settings };
  }
  /**
   * Update multiple settings at once
   */
  updateSettings(t) {
    if (t.orientation !== void 0) {
      const i = t.orientation,
        n = typeof i == "string" ? e.from(i) : i;
      this.orientation = n;
    }
    (t.pixelDensity !== void 0 && (this.pixelDensity = t.pixelDensity),
      t.interlaced !== void 0 && (this.interlaced = t.interlaced),
      t.field !== void 0 && (this.field = t.field));
  }
  /**
   * Sync all settings to GPU buffers
   */
  syncToGpu() {
    this.gpuContext?.initialized &&
      (this.gpuContext.writeOrientation(this.settings.orientation.toBoolean()),
      this.gpuContext.writePixelDensity(this.settings.pixelDensity),
      this.gpuContext.writeInterlaced(this.settings.interlaced),
      this.gpuContext.writeField(this.settings.field === "odd"));
  }
}
export { h as SettingsManager };
//# sourceMappingURL=SettingsManager.js.map
