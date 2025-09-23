import { JsonRpcTransport } from "./transport.ts";
import { DownloadMethods } from "./methods/download.ts";
import { StatusMethods } from "./methods/status.ts";
import { GlobalMethods } from "./methods/global.ts";
import { SystemMethods } from "./methods/system.ts";

import type { Aria2Config } from "./types/config.ts";
import type { DownloadOptions } from "./types/options.ts";
import type { DownloadStatus } from "./types/download.ts";
import type { GlobalOptions } from "./types/options.ts";
import type { GlobalStat, VersionInfo } from "./types/global.ts";

import { validateConfig } from "./types/config.ts";
import {
  Aria2Error,
  AuthenticationError,
  ConfigurationError,
  JsonRpcError,
  NetworkError,
  ValidationError,
} from "./types/errors.ts";

/**
 * Main Aria2 JSON-RPC client class
 * Provides a comprehensive interface to aria2 download manager
 *
 * @example Basic usage
 * ```typescript
 * import { Aria2 } from "@hitarashi/aria2";
 *
 * const aria2 = new Aria2();
 * const gid = await aria2.addUri(["https://example.com/file.zip"]);
 * const status = await aria2.tellStatus(gid);
 * console.log(`Progress: ${status.completedLength}/${status.totalLength}`);
 * ```
 *
 * @example With configuration
 * ```typescript
 * const aria2 = new Aria2({
 *   baseUrl: "http://localhost:6800/jsonrpc",
 *   secret: "your-secret-token",
 *   timeout: 30000
 * });
 * ```
 */
export class Aria2 {
  private readonly transport: JsonRpcTransport;
  private readonly downloadMethods: DownloadMethods;
  private readonly statusMethods: StatusMethods;
  private readonly globalMethods: GlobalMethods;
  private readonly systemMethods: SystemMethods;

  /**
   * Creates a new Aria2 client instance
   * @param config - Optional configuration for the client
   * @throws {ConfigurationError} When configuration is invalid
   * @throws {ValidationError} When configuration validation fails
   *
   * @example Default configuration
   * ```typescript
   * const aria2 = new Aria2(); // Uses localhost:6800/jsonrpc
   * ```
   *
   * @example Custom configuration
   * ```typescript
   * const aria2 = new Aria2({
   *   baseUrl: "http://192.168.1.100:6800/jsonrpc",
   *   secret: "mySecretToken",
   *   timeout: 60000,
   *   headers: { "User-Agent": "MyApp/1.0" }
   * });
   * ```
   */
  constructor(config?: Aria2Config) {
    // Validate and normalize configuration with defaults
    const validatedConfig = validateConfig(config);

    // Initialize transport layer
    this.transport = new JsonRpcTransport(validatedConfig);

    // Initialize method handlers
    this.downloadMethods = new DownloadMethods(this.transport);
    this.statusMethods = new StatusMethods(this.transport);
    this.globalMethods = new GlobalMethods(this.transport);
    this.systemMethods = new SystemMethods(this.transport);
  }

  // Download management methods
  /**
   * Add download from URIs
   * @param uris - Array of URIs to download from
   * @param options - Optional download options
   * @returns Promise resolving to download GID
   * @throws {ValidationError} When URIs are invalid
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   *
   * @example Basic download
   * ```typescript
   * const gid = await aria2.addUri(["https://example.com/file.zip"]);
   * console.log(`Download started with GID: ${gid}`);
   * ```
   *
   * @example Download with options
   * ```typescript
   * const gid = await aria2.addUri([
   *   "https://example.com/file.zip",
   *   "https://mirror.example.com/file.zip" // Fallback URL
   * ], {
   *   dir: "/downloads",
   *   out: "myfile.zip",
   *   "max-connection-per-server": 4,
   *   "split": 8
   * });
   * ```
   */
  async addUri(uris: string[], options?: DownloadOptions): Promise<string> {
    try {
      return await this.downloadMethods.addUri(uris, options);
    } catch (error) {
      throw this.enhanceError(error, "addUri", { uris, options });
    }
  }

  /**
   * Add download from torrent data
   * @param torrent - Torrent file data as base64 string or Uint8Array
   * @param uris - Optional array of web seed URIs
   * @param options - Optional download options
   * @returns Promise resolving to download GID
   * @throws {ValidationError} When torrent data or URIs are invalid
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   *
   * @example From file
   * ```typescript
   * const torrentData = await Deno.readFile("./file.torrent");
   * const gid = await aria2.addTorrent(torrentData, [], {
   *   dir: "/downloads/torrents",
   *   "bt-max-peers": 100
   * });
   * ```
   *
   * @example With web seeds
   * ```typescript
   * const gid = await aria2.addTorrent(torrentData, [
   *   "https://webseed1.example.com/file",
   *   "https://webseed2.example.com/file"
   * ]);
   * ```
   */
  async addTorrent(
    torrent: string | Uint8Array,
    uris?: string[],
    options?: DownloadOptions,
  ): Promise<string> {
    try {
      return await this.downloadMethods.addTorrent(torrent, uris, options);
    } catch (error) {
      throw this.enhanceError(error, "addTorrent", {
        torrent: "[torrent data]",
        uris,
        options,
      });
    }
  }

  /**
   * Add download from metalink data
   * @param metalink - Metalink file data as base64 string or Uint8Array
   * @param options - Optional download options
   * @returns Promise resolving to array of download GIDs
   * @throws {ValidationError} When metalink data is invalid
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async addMetalink(
    metalink: string | Uint8Array,
    options?: DownloadOptions,
  ): Promise<string[]> {
    try {
      return await this.downloadMethods.addMetalink(metalink, options);
    } catch (error) {
      throw this.enhanceError(error, "addMetalink", {
        metalink: "[metalink data]",
        options,
      });
    }
  }

  /**
   * Pause a download
   * @param gid - Download GID to pause
   * @returns Promise resolving to the GID of paused download
   * @throws {ValidationError} When GID is invalid
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async pause(gid: string): Promise<string> {
    try {
      return await this.downloadMethods.pause(gid);
    } catch (error) {
      throw this.enhanceError(error, "pause", { gid });
    }
  }

  /**
   * Unpause a download
   * @param gid - Download GID to unpause
   * @returns Promise resolving to the GID of unpaused download
   * @throws {ValidationError} When GID is invalid
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async unpause(gid: string): Promise<string> {
    try {
      return await this.downloadMethods.unpause(gid);
    } catch (error) {
      throw this.enhanceError(error, "unpause", { gid });
    }
  }

  /**
   * Remove a download
   * @param gid - Download GID to remove
   * @returns Promise resolving to the GID of removed download
   * @throws {ValidationError} When GID is invalid
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async remove(gid: string): Promise<string> {
    try {
      return await this.downloadMethods.remove(gid);
    } catch (error) {
      throw this.enhanceError(error, "remove", { gid });
    }
  }

  /**
   * Force remove a download
   * @param gid - Download GID to force remove
   * @returns Promise resolving to the GID of removed download
   * @throws {ValidationError} When GID is invalid
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async forceRemove(gid: string): Promise<string> {
    try {
      return await this.downloadMethods.forceRemove(gid);
    } catch (error) {
      throw this.enhanceError(error, "forceRemove", { gid });
    }
  }

  // Status query methods
  /**
   * Returns download progress information for the specified GID
   * @param gid - Download GID
   * @param keys - Optional array of keys to retrieve (filters response)
   * @returns Promise resolving to download status
   * @throws {ValidationError} When GID or keys are invalid
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   *
   * @example Get full status
   * ```typescript
   * const status = await aria2.tellStatus(gid);
   * console.log({
   *   status: status.status,
   *   progress: `${status.completedLength}/${status.totalLength}`,
   *   speed: status.downloadSpeed
   * });
   * ```
   *
   * @example Get specific fields only
   * ```typescript
   * const status = await aria2.tellStatus(gid, [
   *   "status", "completedLength", "totalLength", "downloadSpeed"
   * ]);
   * ```
   */
  async tellStatus(gid: string, keys?: string[]): Promise<DownloadStatus> {
    try {
      return await this.statusMethods.tellStatus(gid, keys);
    } catch (error) {
      throw this.enhanceError(error, "tellStatus", { gid, keys });
    }
  }

  /**
   * Returns a list of active downloads
   * @param keys - Optional array of keys to retrieve (filters response)
   * @returns Promise resolving to array of active download statuses
   * @throws {ValidationError} When keys are invalid
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async tellActive(keys?: string[]): Promise<DownloadStatus[]> {
    try {
      return await this.statusMethods.tellActive(keys);
    } catch (error) {
      throw this.enhanceError(error, "tellActive", { keys });
    }
  }

  /**
   * Returns a list of waiting downloads
   * @param offset - Offset from the beginning of the waiting queue
   * @param num - Number of downloads to retrieve
   * @param keys - Optional array of keys to retrieve (filters response)
   * @returns Promise resolving to array of waiting download statuses
   * @throws {ValidationError} When parameters are invalid
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async tellWaiting(
    offset: number,
    num: number,
    keys?: string[],
  ): Promise<DownloadStatus[]> {
    try {
      return await this.statusMethods.tellWaiting(offset, num, keys);
    } catch (error) {
      throw this.enhanceError(error, "tellWaiting", { offset, num, keys });
    }
  }

  /**
   * Returns a list of stopped downloads
   * @param offset - Offset from the beginning of the stopped queue
   * @param num - Number of downloads to retrieve
   * @param keys - Optional array of keys to retrieve (filters response)
   * @returns Promise resolving to array of stopped download statuses
   * @throws {ValidationError} When parameters are invalid
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async tellStopped(
    offset: number,
    num: number,
    keys?: string[],
  ): Promise<DownloadStatus[]> {
    try {
      return await this.statusMethods.tellStopped(offset, num, keys);
    } catch (error) {
      throw this.enhanceError(error, "tellStopped", { offset, num, keys });
    }
  }

  // Global configuration methods
  /**
   * Get global options
   * @returns Promise resolving to global options object
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async getGlobalOption(): Promise<GlobalOptions> {
    try {
      return await this.globalMethods.getGlobalOption();
    } catch (error) {
      throw this.enhanceError(error, "getGlobalOption");
    }
  }

  /**
   * Change global options
   * @param options - Global options to change
   * @returns Promise resolving to "OK" on success
   * @throws {ValidationError} When options are invalid
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async changeGlobalOption(options: Partial<GlobalOptions>): Promise<string> {
    try {
      return await this.globalMethods.changeGlobalOption(options);
    } catch (error) {
      throw this.enhanceError(error, "changeGlobalOption", { options });
    }
  }

  /**
   * Get global statistics
   * @returns Promise resolving to global statistics
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async getGlobalStat(): Promise<GlobalStat> {
    try {
      return await this.globalMethods.getGlobalStat();
    } catch (error) {
      throw this.enhanceError(error, "getGlobalStat");
    }
  }

  // System operation methods
  /**
   * Get aria2 version information
   * @returns Promise resolving to version information
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async getVersion(): Promise<VersionInfo> {
    try {
      return await this.systemMethods.getVersion();
    } catch (error) {
      throw this.enhanceError(error, "getVersion");
    }
  }

  /**
   * Shutdown aria2 server
   * @returns Promise resolving to "OK" on success
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async shutdown(): Promise<string> {
    try {
      return await this.systemMethods.shutdown();
    } catch (error) {
      throw this.enhanceError(error, "shutdown");
    }
  }

  /**
   * Force shutdown aria2 server
   * This method immediately shuts down aria2 without waiting for active downloads to complete
   * @returns Promise resolving to "OK" on success
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async forceShutdown(): Promise<string> {
    try {
      return await this.systemMethods.forceShutdown();
    } catch (error) {
      throw this.enhanceError(error, "forceShutdown");
    }
  }

  /**
   * Save session information
   * Saves the current session to the file specified by --save-session option
   * @returns Promise resolving to "OK" on success
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async saveSession(): Promise<string> {
    try {
      return await this.systemMethods.saveSession();
    } catch (error) {
      throw this.enhanceError(error, "saveSession");
    }
  }

  /**
   * Purge download result
   * Purges completed/error/removed downloads to free memory
   * @returns Promise resolving to "OK" on success
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async purgeDownloadResult(): Promise<string> {
    try {
      return await this.systemMethods.purgeDownloadResult();
    } catch (error) {
      throw this.enhanceError(error, "purgeDownloadResult");
    }
  }

  /**
   * Remove download result
   * Removes completed/error/removed download denoted by gid from memory
   * @param gid - Download GID to remove from memory
   * @returns Promise resolving to "OK" on success
   * @throws {ValidationError} When GID is invalid
   * @throws {NetworkError} When network communication fails
   * @throws {JsonRpcError} When aria2 returns an error
   */
  async removeDownloadResult(gid: string): Promise<string> {
    try {
      return await this.systemMethods.removeDownloadResult(gid);
    } catch (error) {
      throw this.enhanceError(error, "removeDownloadResult", { gid });
    }
  }

  /**
   * Type-safe multicall: perform several RPC methods in one atomic request.
   * The return type is a tuple/array matching the input order.
   *
   * @example
   * const results = await aria2.multicall([
   *   { method: "aria2.addUri", params: [["http://example.com"]] },
   *   { method: "aria2.getVersion", params: [] },
   * ]);
   * // results: [ [gid-string], [versionInfo] ]
   */
  async multicall<
    const T extends readonly import("./types/jsonrpc.ts").MulticallSingle<
      import("./types/jsonrpc.ts").MulticallAllowedMethodName
    >[],
  >(methods: T): Promise<import("./types/jsonrpc.ts").MulticallResults<T>> {
    return this.systemMethods.multicall(methods);
  }

  close() {
    this.transport.close();
  }

  /**
   * Enhances errors with additional context and user-friendly messages
   * @param error - Original error
   * @param method - Method name where error occurred
   * @param params - Method parameters for context
   * @returns Enhanced error with better messaging
   */
  private enhanceError(
    error: unknown,
    method: string,
    params?: Record<string, unknown>,
  ): Aria2Error {
    // If it's already an Aria2Error, enhance it with context
    if (error instanceof Aria2Error) {
      // Add method context to the error message if not already present
      if (!error.message.includes(method)) {
        const contextMessage = `Error in ${method}(): ${error.message}`;

        // Create a new error of the same type with enhanced message
        if (error.code === "NETWORK_ERROR") {
          return new NetworkError(
            this.createUserFriendlyMessage(error, method, params),
            { cause: error },
          );
        } else if (error.code === "AUTH_ERROR") {
          return new AuthenticationError(
            "Authentication failed. Please check your secret token configuration.",
            { cause: error },
          );
        } else if (error.code === "JSONRPC_ERROR") {
          const jsonRpcError = error as JsonRpcError;
          return new JsonRpcError(
            this.createJsonRpcUserFriendlyMessage(jsonRpcError, method),
            jsonRpcError.rpcCode,
            jsonRpcError.rpcData,
            { cause: error },
          );
        } else if (error.code === "VALIDATION_ERROR") {
          return new ValidationError(
            `Invalid parameters for ${method}(): ${error.message}`,
            { cause: error },
          );
        } else if (error.code === "CONFIG_ERROR") {
          return new ConfigurationError(
            `Configuration error: ${error.message}`,
            { cause: error },
          );
        }
      }

      return error;
    }

    // For unknown errors, wrap them as NetworkError
    return new NetworkError(
      `Unexpected error in ${method}(): ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }

  /**
   * Creates user-friendly error messages for common scenarios
   * @param error - Original error
   * @param method - Method name
   * @param params - Method parameters
   * @returns User-friendly error message
   */
  private createUserFriendlyMessage(
    error: Aria2Error,
    method: string,
    params?: Record<string, unknown>,
  ): string {
    if (error.code === "NETWORK_ERROR") {
      if (error.message.includes("timeout")) {
        return `Connection to aria2 timed out while calling ${method}(). Please check if aria2 is running and accessible.`;
      } else if (
        error.message.includes("connection failed") ||
        error.message.includes("fetch")
      ) {
        return `Cannot connect to aria2 server while calling ${method}(). Please verify the server is running and the baseUrl is correct.`;
      } else if (
        error.message.includes("401") ||
        error.message.includes("403")
      ) {
        return `Authentication failed while calling ${method}(). Please check your secret token.`;
      } else if (error.message.includes("404")) {
        return `aria2 JSON-RPC endpoint not found while calling ${method}(). Please verify the baseUrl path.`;
      }
    }

    return `Error in ${method}(): ${error.message}`;
  }

  /**
   * Creates user-friendly messages for JSON-RPC errors
   * @param error - JsonRpcError instance
   * @param method - Method name
   * @returns User-friendly error message
   */
  private createJsonRpcUserFriendlyMessage(
    error: JsonRpcError,
    method: string,
  ): string {
    switch (error.rpcCode) {
      case 1:
        return `Authentication failed for ${method}(). Please verify your secret token is correct.`;
      case 2:
        return `Method ${method}() is not supported by this aria2 version.`;
      case 3:
        return `Invalid parameters provided to ${method}(). Please check the parameter types and values.`;
      case 4:
        return `Download not found. The specified GID may be invalid or the download may have been removed.`;
      case 5:
        return `Download cannot be paused in its current state.`;
      case 6:
        return `Download cannot be resumed in its current state.`;
      case 7:
        return `Download cannot be removed in its current state.`;
      default:
        return `aria2 error in ${method}(): ${error.message} (code: ${error.rpcCode})`;
    }
  }
}
