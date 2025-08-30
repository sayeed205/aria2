/**
 * Global statistics from aria2
 */
export interface GlobalStat {
  /** Download speed in bytes/sec */
  downloadSpeed: string;
  /** Upload speed in bytes/sec */
  uploadSpeed: string;
  /** Number of active downloads */
  numActive: string;
  /** Number of waiting downloads */
  numWaiting: string;
  /** Number of stopped downloads */
  numStopped: string;
  /** Number of stopped downloads due to error */
  numStoppedTotal: string;
}

/**
 * Version information from aria2
 */
export interface VersionInfo {
  /** aria2 version */
  version: string;
  /** Enabled features */
  enabledFeatures: string[];
}
