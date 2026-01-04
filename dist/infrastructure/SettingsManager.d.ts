import {
  ProcessorSettings,
  Orientation as OrientationType,
} from "../core/types.js";
import { Orientation } from "../core/value-objects/Orientation.js";
import { ISettingsManager } from "../core/ports/ISettingsManager.js";
import { IGpuContext } from "../core/ports/IGpuContext.js";
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
export declare class SettingsManager implements ISettingsManager {
  private settings;
  private gpuContext;
  constructor(initialSettings?: SettingsInput);
  /**
   * Connect to a GPU context for buffer synchronization
   */
  connect(gpuContext: IGpuContext): void;
  /**
   * Disconnect from GPU context
   */
  disconnect(): void;
  /**
   * Get the current orientation
   */
  get orientation(): Orientation;
  /**
   * Set the RGB stripe orientation
   */
  set orientation(value: Orientation);
  /**
   * Get the current pixel density
   */
  get pixelDensity(): number;
  /**
   * Set the pixel density for chunky pixel effect
   */
  set pixelDensity(value: number);
  /**
   * Get the current interlaced mode
   */
  get interlaced(): boolean;
  /**
   * Set interlaced rendering mode
   */
  set interlaced(value: boolean);
  /**
   * Get the current field selection
   */
  get field(): "odd" | "even";
  /**
   * Set field selection for interlaced rendering
   */
  set field(value: "odd" | "even");
  /**
   * Get a copy of all current settings
   */
  getSettings(): ProcessorSettings;
  /**
   * Update multiple settings at once
   */
  updateSettings(updates: Partial<ProcessorSettings>): void;
  /**
   * Sync all settings to GPU buffers
   */
  private syncToGpu;
}
export {};
//# sourceMappingURL=SettingsManager.d.ts.map
