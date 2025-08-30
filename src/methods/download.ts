import type { JsonRpcTransport } from "../transport.ts";
import type { DownloadOptions } from "../types/options.ts";

import { ValidationError } from "../types/errors.ts";

/**
 * Download management methods for aria2 JSON-RPC client
 * Handles adding downloads via URI, torrent, and metalink
 */
export class DownloadMethods {
  constructor(private readonly transport: JsonRpcTransport) {}

  /**
   * Add download from URIs
   * @param uris - Array of URIs to download from
   * @param options - Optional download options
   * @returns Promise resolving to download GID
   */
  async addUri(uris: string[], options?: DownloadOptions): Promise<string> {
    this.validateUris(uris);

    const params: [string[], Record<string, unknown>?] = options
      ? [uris, options as Record<string, unknown>]
      : [uris];

    return await this.transport.call("aria2.addUri", params);
  }

  /**
   * Add download from torrent data
   * @param torrent - Torrent file data as base64 string or Uint8Array
   * @param uris - Optional array of web seed URIs
   * @param options - Optional download options
   * @returns Promise resolving to download GID
   */
  async addTorrent(
    torrent: string | Uint8Array,
    uris?: string[],
    options?: DownloadOptions,
  ): Promise<string> {
    const torrentData = this.processTorrentData(torrent);

    if (uris) {
      this.validateUris(uris);
    }

    const params: [string, string[]?, Record<string, unknown>?] = [torrentData];

    if (uris && uris.length > 0) {
      params[1] = uris;
      if (options) {
        params[2] = options as Record<string, unknown>;
      }
    } else if (options) {
      params[1] = undefined;
      params[2] = options as Record<string, unknown>;
    }

    return await this.transport.call("aria2.addTorrent", params);
  }

  /**
   * Add download from metalink data
   * @param metalink - Metalink file data as base64 string or Uint8Array
   * @param options - Optional download options
   * @returns Promise resolving to array of download GIDs
   */
  async addMetalink(
    metalink: string | Uint8Array,
    options?: DownloadOptions,
  ): Promise<string[]> {
    const metalinkData = this.processMetalinkData(metalink);

    const params: [string, Record<string, unknown>?] = options
      ? [metalinkData, options as Record<string, unknown>]
      : [metalinkData];

    return await this.transport.call("aria2.addMetalink", params);
  }

  /**
   * Pause a download
   * @param gid - Download GID to pause
   * @returns Promise resolving to the GID of paused download
   */
  async pause(gid: string): Promise<string> {
    this.validateGid(gid);
    return await this.transport.call("aria2.pause", [gid]);
  }

  /**
   * Unpause a download
   * @param gid - Download GID to unpause
   * @returns Promise resolving to the GID of unpaused download
   */
  async unpause(gid: string): Promise<string> {
    this.validateGid(gid);
    return await this.transport.call("aria2.unpause", [gid]);
  }

  /**
   * Remove a download
   * @param gid - Download GID to remove
   * @returns Promise resolving to the GID of removed download
   */
  async remove(gid: string): Promise<string> {
    this.validateGid(gid);
    return await this.transport.call("aria2.remove", [gid]);
  }

  /**
   * Force remove a download
   * @param gid - Download GID to force remove
   * @returns Promise resolving to the GID of removed download
   */
  async forceRemove(gid: string): Promise<string> {
    this.validateGid(gid);
    return await this.transport.call("aria2.forceRemove", [gid]);
  }

  /**
   * Validates array of URIs
   * @param uris - URIs to validate
   * @throws ValidationError if URIs are invalid
   */
  private validateUris(uris: string[]): void {
    if (!Array.isArray(uris) || uris.length === 0) {
      throw new ValidationError("URIs must be a non-empty array");
    }

    for (const uri of uris) {
      if (typeof uri !== "string" || uri.trim().length === 0) {
        throw new ValidationError("All URIs must be non-empty strings");
      }

      // Basic URI format validation
      try {
        new URL(uri);
      } catch {
        throw new ValidationError(`Invalid URI format: ${uri}`);
      }
    }
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
   * Processes torrent data for aria2 API
   * @param torrent - Torrent data as string or Uint8Array
   * @returns Base64 encoded torrent data
   */
  private processTorrentData(torrent: string | Uint8Array): string {
    if (typeof torrent === "string") {
      // Assume it's already base64 encoded
      try {
        // Validate base64 format
        atob(torrent);
        return torrent;
      } catch {
        throw new ValidationError("Invalid base64 torrent data");
      }
    }

    if (torrent instanceof Uint8Array) {
      // Convert binary data to base64
      try {
        const binaryString = Array.from(
          torrent,
          (byte) => String.fromCharCode(byte),
        ).join("");
        return btoa(binaryString);
      } catch (error) {
        throw new ValidationError(
          `Failed to encode torrent data: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    throw new ValidationError(
      "Torrent data must be a base64 string or Uint8Array",
    );
  }

  /**
   * Processes metalink data for aria2 API
   * @param metalink - Metalink data as string or Uint8Array
   * @returns Base64 encoded metalink data
   */
  private processMetalinkData(metalink: string | Uint8Array): string {
    if (typeof metalink === "string") {
      // Assume it's already base64 encoded
      try {
        // Validate base64 format
        atob(metalink);
        return metalink;
      } catch {
        throw new ValidationError("Invalid base64 metalink data");
      }
    }

    if (metalink instanceof Uint8Array) {
      // Convert binary data to base64
      try {
        const binaryString = Array.from(
          metalink,
          (byte) => String.fromCharCode(byte),
        ).join("");
        return btoa(binaryString);
      } catch (error) {
        throw new ValidationError(
          `Failed to encode metalink data: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    throw new ValidationError(
      "Metalink data must be a base64 string or Uint8Array",
    );
  }
}
