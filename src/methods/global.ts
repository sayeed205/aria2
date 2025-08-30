import type { JsonRpcTransport } from "../transport.ts";
import type { GlobalOptions } from "../types/options.ts";
import type { GlobalStat } from "../types/global.ts";

import { ValidationError } from "../types/errors.ts";

/**
 * Global configuration and statistics methods for aria2 JSON-RPC client
 * Handles global options and system statistics
 */
export class GlobalMethods {
  constructor(private readonly transport: JsonRpcTransport) {}

  /**
   * Get global options
   * @returns Promise resolving to global options object
   */
  async getGlobalOption(): Promise<GlobalOptions> {
    return await this.transport.call("aria2.getGlobalOption", []);
  }

  /**
   * Change global options
   * @param options - Global options to change
   * @returns Promise resolving to "OK" on success
   */
  async changeGlobalOption(options: Partial<GlobalOptions>): Promise<string> {
    this.validateGlobalOptions(options);

    // Convert options to the format expected by aria2
    const formattedOptions = this.formatGlobalOptions(options);

    return await this.transport.call("aria2.changeGlobalOption", [
      formattedOptions,
    ]);
  }

  /**
   * Get global statistics
   * @returns Promise resolving to global statistics
   */
  async getGlobalStat(): Promise<GlobalStat> {
    return await this.transport.call(
      "aria2.getGlobalStat",
      [],
    ) as unknown as GlobalStat;
  }

  /**
   * Validates global options object
   * @param options - Options to validate
   * @throws ValidationError if options are invalid
   */
  private validateGlobalOptions(options: Partial<GlobalOptions>): void {
    if (!options || typeof options !== "object") {
      throw new ValidationError("Global options must be an object");
    }

    if (Object.keys(options).length === 0) {
      throw new ValidationError("Global options cannot be empty");
    }

    // Validate specific option types and values
    for (const [key, value] of Object.entries(options)) {
      // Skip validation for undefined/null values - they will be filtered out during formatting
      if (value !== undefined && value !== null) {
        this.validateGlobalOptionValue(key, value);
      }
    }
  }

  /**
   * Validates individual global option value
   * @param key - Option key
   * @param value - Option value
   * @throws ValidationError if value is invalid
   */
  private validateGlobalOptionValue(key: string, value: unknown): void {
    // This method should only be called with non-null/undefined values
    if (value === undefined || value === null) {
      throw new ValidationError(
        `Global option '${key}' cannot be null or undefined`,
      );
    }

    // Validate numeric options
    const numericOptions = [
      "split",
      "max-connection-per-server",
      "max-concurrent-downloads",
      "bt-max-peers",
      "bt-max-open-files",
      "bt-tracker-connect-timeout",
      "bt-tracker-interval",
      "bt-tracker-timeout",
      "bt-stop-timeout",
      "seed-ratio",
      "seed-time",
      "dht-message-timeout",
      "rpc-listen-port",
      "timeout",
      "retry-wait",
      "server-stat-timeout",
      "save-session-interval",
    ];

    if (numericOptions.includes(key)) {
      if (typeof value !== "number" || value < 0) {
        throw new ValidationError(
          `Global option '${key}' must be a non-negative number`,
        );
      }
    }

    // Validate boolean options
    const booleanOptions = [
      "continue",
      "check-integrity",
      "allow-overwrite",
      "auto-file-renaming",
      "conditional-get",
      "parameterized-uri",
      "remote-time",
      "reuse-uri",
      "bt-seed-unverified",
      "bt-hash-check-seed",
      "follow-torrent",
      "enable-dht",
      "enable-dht6",
      "enable-peer-exchange",
      "rpc-listen-all",
      "rpc-save-upload-metadata",
      "rpc-secure",
      "optimize-concurrent-downloads",
    ];

    if (booleanOptions.includes(key)) {
      if (typeof value !== "boolean") {
        throw new ValidationError(`Global option '${key}' must be a boolean`);
      }
    }

    // Validate string options
    const stringOptions = [
      "dir",
      "out",
      "min-split-size",
      "max-download-limit",
      "referer",
      "user-agent",
      "http-proxy",
      "https-proxy",
      "ftp-proxy",
      "all-proxy",
      "no-proxy",
      "proxy-method",
      "uri-selector",
      "bt-request-peer-speed-limit",
      "bt-max-upload-limit",
      "listen-port",
      "dht-listen-port",
      "dht-entry-point",
      "dht-entry-point6",
      "dht-file-path",
      "dht-file-path6",
      "peer-id-prefix",
      "rpc-max-request-size",
      "log",
      "max-overall-download-limit",
      "max-overall-upload-limit",
      "save-session",
    ];

    if (stringOptions.includes(key)) {
      if (typeof value !== "string" || value.trim().length === 0) {
        throw new ValidationError(
          `Global option '${key}' must be a non-empty string`,
        );
      }
    }

    // Validate log-level enum
    if (key === "log-level") {
      const validLevels = ["debug", "info", "notice", "warn", "error"];
      if (typeof value !== "string" || !validLevels.includes(value)) {
        throw new ValidationError(
          `Global option 'log-level' must be one of: ${validLevels.join(", ")}`,
        );
      }
    }

    // Validate header array
    if (key === "header") {
      if (!Array.isArray(value)) {
        throw new ValidationError(`Global option 'header' must be an array`);
      }
      for (const header of value) {
        if (typeof header !== "string" || header.trim().length === 0) {
          throw new ValidationError(`All headers must be non-empty strings`);
        }
      }
    }
  }

  /**
   * Formats global options for aria2 API
   * @param options - Options to format
   * @returns Formatted options object
   */
  private formatGlobalOptions(
    options: Partial<GlobalOptions>,
  ): Record<string, string> {
    const formatted: Record<string, string> = {};

    for (const [key, value] of Object.entries(options)) {
      if (value === undefined || value === null) {
        continue;
      }

      // Convert all values to strings as expected by aria2
      if (typeof value === "boolean") {
        formatted[key] = value ? "true" : "false";
      } else if (typeof value === "number") {
        formatted[key] = value.toString();
      } else if (Array.isArray(value)) {
        // For array values like headers, join them appropriately
        formatted[key] = value.join(",");
      } else {
        formatted[key] = String(value);
      }
    }

    return formatted;
  }
}
