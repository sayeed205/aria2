import type { JsonRpcTransport } from "../transport.ts";
import type { VersionInfo } from "../types/global.ts";
import type {
  Aria2MethodName,
  MulticallSingle,
  MulticallResults,
} from "../types/jsonrpc.ts";

import { ValidationError } from "../types/errors.ts";

/**
 * System operation methods for aria2 JSON-RPC client
 * Handles system information and control operations
 */
export class SystemMethods {
  constructor(private readonly transport: JsonRpcTransport) {}

  /**
   * Get aria2 version information
   * @returns Promise resolving to version information
   */
  async getVersion(): Promise<VersionInfo> {
    return (await this.transport.call(
      "aria2.getVersion",
      [],
    )) as unknown as VersionInfo;
  }

  /**
   * Shutdown aria2 server
   * @returns Promise resolving to "OK" on success
   */
  async shutdown(): Promise<string> {
    return await this.transport.call("aria2.shutdown", []);
  }

  /**
   * Force shutdown aria2 server
   * This method immediately shuts down aria2 without waiting for active downloads to complete
   * @returns Promise resolving to "OK" on success
   */
  async forceShutdown(): Promise<string> {
    return (await this.transport.call("aria2.forceShutdown", [])) as string;
  }

  /**
   * Save session information
   * Saves the current session to the file specified by --save-session option
   * @returns Promise resolving to "OK" on success
   */
  async saveSession(): Promise<string> {
    return (await this.transport.call("aria2.saveSession", [])) as string;
  }

  /**
   * Purge download result
   * Purges completed/error/removed downloads to free memory
   * @returns Promise resolving to "OK" on success
   */
  async purgeDownloadResult(): Promise<string> {
    return (await this.transport.call(
      "aria2.purgeDownloadResult",
      [],
    )) as string;
  }

  /**
   * Remove download result
   * Removes completed/error/removed download denoted by gid from memory
   * @param gid - Download GID to remove from memory
   * @returns Promise resolving to "OK" on success
   */
  async removeDownloadResult(gid: string): Promise<string> {
    this.validateGid(gid);
    return (await this.transport.call("aria2.removeDownloadResult", [
      gid,
    ])) as string;
  }

  /**
   * Validates download GID
   * @param gid - GID to validate
   * @throws ValidationError if GID is invalid
   */
  private validateGid(gid: string): void {
    if (typeof gid !== "string" || gid.trim().length === 0) {
      throw new ValidationError("GID must be a non-empty string");
    }

    // aria2 GIDs are 16-character hexadecimal strings
    if (!/^[0-9a-fA-F]{16}$/.test(gid)) {
      throw new ValidationError(
        `Invalid GID format: ${gid}. Expected 16-character hexadecimal string`,
      );
    }
  }

  /**
   * Type-safe multicall: perform several RPC methods in one atomic request.
   * @param methods Array/tuple of objects: { method, params }
   * @returns Promise resolving to tuple/array of result arrays/errors
   *
   * @example
   * const results = await system.multicall([
   *   { method: "aria2.addUri", params: [["http://example.com"]] },
   *   { method: "aria2.getVersion", params: [] },
   * ]);
   * // results: [ [gid-string], [versionInfo] ]
   */
  async multicall<
    const T extends readonly import("../types/jsonrpc.ts").MulticallSingle<
      import("../types/jsonrpc.ts").MulticallAllowedMethodName
    >[],
  >(methods: T): Promise<MulticallResults<T>> {
    // Validate methodName and params for each entry at runtime.
    const callParams = methods.map((x) => ({
      methodName: x.method,
      params: x.params !== undefined ? [...(x.params as unknown[])] : [],
    }));

    // system.multicall expects the array to be wrapped once more (per aria2 spec)
    const rawResults = await this.transport.call("system.multicall", [
      callParams,
    ]);
    // unwrap [result] to result, or throw on fault
    const resultUnwrapped = (rawResults as unknown[]).map((entry, idx) => {
      if (Array.isArray(entry) && entry.length === 1) {
        return entry[0];
      }
      throw new Error(
        `aria2 multicall failed for method ${methods[idx]?.method}: ${(entry as any)?.faultCode ?? "?"} ${(entry as any)?.faultString ?? ""}`,
      );
    });
    return resultUnwrapped as MulticallResults<T>;
  }
}
