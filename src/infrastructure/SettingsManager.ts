/**
 * Settings Manager
 * Manages runtime settings like orientation and pixel density
 */
import {
  type Orientation,
  type ProcessorSettings,
  DEFAULT_SETTINGS,
} from "../core/types.js";
import type { ISettingsManager } from "../use-cases/ports/ISettingsManager.js";
import type { IGpuContext } from "../use-cases/ports/IGpuContext.js";

/**
 * Manages processor settings and syncs them to GPU buffers
 */
export class SettingsManager implements ISettingsManager {
  private settings: ProcessorSettings;
  private gpuContext: IGpuContext | null = null;

  constructor(initialSettings: Partial<ProcessorSettings> = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...initialSettings };
  }

  /**
   * Connect to a GPU context for buffer synchronization
   */
  connect(gpuContext: IGpuContext): void {
    this.gpuContext = gpuContext;
    // Sync current settings to GPU
    this.syncToGpu();
  }

  /**
   * Disconnect from GPU context
   */
  disconnect(): void {
    this.gpuContext = null;
  }

  /**
   * Get the current orientation
   */
  get orientation(): Orientation {
    return this.settings.orientation;
  }

  /**
   * Set the RGB stripe orientation
   */
  set orientation(value: Orientation) {
    this.settings.orientation = value;
    if (this.gpuContext?.initialized) {
      this.gpuContext.writeOrientation(value === "rows");
    }
  }

  /**
   * Get the current pixel density
   */
  get pixelDensity(): number {
    return this.settings.pixelDensity;
  }

  /**
   * Set the pixel density for chunky pixel effect
   */
  set pixelDensity(value: number) {
    const clampedValue = Math.max(1, Math.floor(value));
    this.settings.pixelDensity = clampedValue;
    if (this.gpuContext?.initialized) {
      this.gpuContext.writePixelDensity(clampedValue);
    }
  }

  /**
   * Get a copy of all current settings
   */
  getSettings(): ProcessorSettings {
    return { ...this.settings };
  }

  /**
   * Update multiple settings at once
   */
  updateSettings(updates: Partial<ProcessorSettings>): void {
    if (updates.orientation !== undefined) {
      this.orientation = updates.orientation;
    }
    if (updates.pixelDensity !== undefined) {
      this.pixelDensity = updates.pixelDensity;
    }
  }

  /**
   * Sync all settings to GPU buffers
   */
  private syncToGpu(): void {
    if (!this.gpuContext?.initialized) {
      return;
    }
    this.gpuContext.writeOrientation(this.settings.orientation === "rows");
    this.gpuContext.writePixelDensity(this.settings.pixelDensity);
  }
}
