/**
 * Settings Manager Repository Interface
 * Defines the contract for settings operations required by use cases
 */
import type { ProcessorSettings } from "../types.js";
import type { Orientation } from "../value-objects/Orientation.js";
import type { IGpuContext } from "./IGpuContext.js";

/**
 * Interface for settings management operations
 * Use cases depend on this abstraction, not concrete implementations
 */
export interface ISettingsManager {
  /** Get/set the current orientation */
  orientation: Orientation;

  /** Get/set the current pixel density */
  pixelDensity: number;

  /** Get/set interlaced rendering mode */
  interlaced: boolean;

  /** Get/set field selection for interlaced rendering */
  field: "odd" | "even";

  /** Get a copy of all current settings */
  getSettings(): ProcessorSettings;

  /** Update multiple settings at once */
  updateSettings(updates: Partial<ProcessorSettings>): void;

  /** Connect to a GPU context for buffer synchronization */
  connect(gpuContext: IGpuContext): void;

  /** Disconnect from GPU context */
  disconnect(): void;
}
