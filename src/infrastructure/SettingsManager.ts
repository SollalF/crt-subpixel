/**
 * Settings Manager
 * Manages runtime settings like orientation and pixel density
 */
import {
  type ProcessorSettings,
  type Orientation as OrientationType,
  DEFAULT_SETTINGS,
} from "../core/types.js";
import { Orientation } from "../core/value-objects/Orientation.js";
import type { ISettingsManager } from "../core/ports/ISettingsManager.js";
import type { IGpuContext } from "../core/ports/IGpuContext.js";

/**
 * Settings input type that allows string orientation for backward compatibility
 */
type SettingsInput = Omit<Partial<ProcessorSettings>, "orientation"> & {
  orientation?: Orientation | OrientationType;
  field?: "odd" | "even";
};

/**
 * Manages processor settings and syncs them to GPU buffers
 */
export class SettingsManager implements ISettingsManager {
  private settings: ProcessorSettings;
  private gpuContext: IGpuContext | null = null;

  constructor(initialSettings: SettingsInput = {}) {
    this.settings = { ...DEFAULT_SETTINGS };
    // Handle orientation conversion if provided
    if (initialSettings.orientation !== undefined) {
      this.settings.orientation =
        typeof initialSettings.orientation === "string"
          ? Orientation.from(initialSettings.orientation)
          : initialSettings.orientation;
    }
    // Handle other settings
    if (initialSettings.pixelDensity !== undefined) {
      this.settings.pixelDensity = initialSettings.pixelDensity;
    }
    if (initialSettings.interlaced !== undefined) {
      this.settings.interlaced = initialSettings.interlaced;
    }
    if (initialSettings.field !== undefined) {
      this.settings.field = initialSettings.field;
    }
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
      this.gpuContext.writeOrientation(value.toBoolean());
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
   * Get the current interlaced mode
   */
  get interlaced(): boolean {
    return this.settings.interlaced;
  }

  /**
   * Set interlaced rendering mode
   */
  set interlaced(value: boolean) {
    this.settings.interlaced = value;
    if (this.gpuContext?.initialized) {
      this.gpuContext.writeInterlaced(value);
    }
  }

  /**
   * Get the current field selection
   */
  get field(): "odd" | "even" {
    return this.settings.field;
  }

  /**
   * Set field selection for interlaced rendering
   */
  set field(value: "odd" | "even") {
    this.settings.field = value;
    if (this.gpuContext?.initialized) {
      this.gpuContext.writeField(value === "odd");
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
      // Convert string to value object if needed (for backward compatibility)
      // Type assertion needed because ProcessorSettings.orientation is OrientationVO,
      // but we allow string input for backward compatibility
      const orientationValue = updates.orientation as
        | Orientation
        | OrientationType;
      const orientation =
        typeof orientationValue === "string"
          ? Orientation.from(orientationValue)
          : orientationValue;
      this.orientation = orientation;
    }
    if (updates.pixelDensity !== undefined) {
      this.pixelDensity = updates.pixelDensity;
    }
    if (updates.interlaced !== undefined) {
      this.interlaced = updates.interlaced;
    }
    if (updates.field !== undefined) {
      this.field = updates.field;
    }
  }

  /**
   * Sync all settings to GPU buffers
   */
  private syncToGpu(): void {
    if (!this.gpuContext?.initialized) {
      return;
    }
    this.gpuContext.writeOrientation(this.settings.orientation.toBoolean());
    this.gpuContext.writePixelDensity(this.settings.pixelDensity);
    this.gpuContext.writeInterlaced(this.settings.interlaced);
    this.gpuContext.writeField(this.settings.field === "odd");
  }
}
