import { JsonRpcTransport } from "../transport.ts";
import { DownloadStatus } from "../types/download.ts";
import { ValidationError } from "../types/errors.ts";

/**
 * Status query methods for aria2 downloads
 * Handles retrieving download status information with type safety
 */
export class StatusMethods {
  constructor(private readonly transport: JsonRpcTransport) {}

  /**
   * Returns download progress information for the specified GID
   * @param gid - Download GID
   * @param keys - Optional array of keys to retrieve (filters response)
   * @returns Promise resolving to download status
   */
  async tellStatus(gid: string, keys?: string[]): Promise<DownloadStatus> {
    this.validateGid(gid);

    if (keys !== undefined) {
      this.validateKeys(keys);
    }

    const result = keys
      ? await this.transport.call(
        "aria2.tellStatus",
        [gid, keys] as [string, string[]],
      )
      : await this.transport.call("aria2.tellStatus", [gid] as [string]);

    return this.parseDownloadStatus(result);
  }

  /**
   * Returns a list of active downloads
   * @param keys - Optional array of keys to retrieve (filters response)
   * @returns Promise resolving to array of active download statuses
   */
  async tellActive(keys?: string[]): Promise<DownloadStatus[]> {
    if (keys !== undefined) {
      this.validateKeys(keys);
    }

    const result = keys
      ? await this.transport.call("aria2.tellActive", [keys] as [string[]])
      : await this.transport.call("aria2.tellActive", [] as []);

    return this.parseDownloadStatusArray(result);
  }

  /**
   * Returns a list of waiting downloads
   * @param offset - Offset from the beginning of the waiting queue
   * @param num - Number of downloads to retrieve
   * @param keys - Optional array of keys to retrieve (filters response)
   * @returns Promise resolving to array of waiting download statuses
   */
  async tellWaiting(
    offset: number,
    num: number,
    keys?: string[],
  ): Promise<DownloadStatus[]> {
    this.validatePaginationParams(offset, num);

    if (keys !== undefined) {
      this.validateKeys(keys);
    }

    const result = keys
      ? await this.transport.call(
        "aria2.tellWaiting",
        [offset, num, keys] as [number, number, string[]],
      )
      : await this.transport.call(
        "aria2.tellWaiting",
        [offset, num] as [number, number],
      );

    return this.parseDownloadStatusArray(result);
  }

  /**
   * Returns a list of stopped downloads
   * @param offset - Offset from the beginning of the stopped queue
   * @param num - Number of downloads to retrieve
   * @param keys - Optional array of keys to retrieve (filters response)
   * @returns Promise resolving to array of stopped download statuses
   */
  async tellStopped(
    offset: number,
    num: number,
    keys?: string[],
  ): Promise<DownloadStatus[]> {
    this.validatePaginationParams(offset, num);

    if (keys !== undefined) {
      this.validateKeys(keys);
    }

    const result = keys
      ? await this.transport.call(
        "aria2.tellStopped",
        [offset, num, keys] as [number, number, string[]],
      )
      : await this.transport.call(
        "aria2.tellStopped",
        [offset, num] as [number, number],
      );

    return this.parseDownloadStatusArray(result);
  }

  /**
   * Validates GID parameter
   * @param gid - GID to validate
   */
  private validateGid(gid: string): void {
    if (typeof gid !== "string" || gid.trim() === "") {
      throw new ValidationError("GID must be a non-empty string");
    }

    // aria2 GIDs are 16-character hexadecimal strings
    if (!/^[0-9a-fA-F]{16}$/.test(gid)) {
      throw new ValidationError(
        "GID must be a 16-character hexadecimal string",
      );
    }
  }

  /**
   * Validates keys parameter
   * @param keys - Keys array to validate
   */
  private validateKeys(keys: string[]): void {
    if (!Array.isArray(keys)) {
      throw new ValidationError("Keys must be an array of strings");
    }

    if (keys.length === 0) {
      throw new ValidationError("Keys array cannot be empty");
    }

    for (const key of keys) {
      if (typeof key !== "string" || key.trim() === "") {
        throw new ValidationError("All keys must be non-empty strings");
      }
    }
  }

  /**
   * Validates pagination parameters
   * @param offset - Offset to validate
   * @param num - Number to validate
   */
  private validatePaginationParams(offset: number, num: number): void {
    if (!Number.isInteger(offset) || offset < 0) {
      throw new ValidationError("Offset must be a non-negative integer");
    }

    if (!Number.isInteger(num) || num <= 0) {
      throw new ValidationError("Number must be a positive integer");
    }

    // aria2 has a maximum limit of 1000 downloads per request
    if (num > 1000) {
      throw new ValidationError("Number cannot exceed 1000");
    }
  }

  /**
   * Parses raw response data into DownloadStatus object
   * @param data - Raw response data
   * @returns Parsed DownloadStatus object
   */
  private parseDownloadStatus(data: unknown): DownloadStatus {
    if (typeof data !== "object" || data === null) {
      throw new ValidationError("Invalid download status response format");
    }

    const status = data as Record<string, unknown>;

    // Validate required fields
    this.validateRequiredStatusFields(status);

    return {
      gid: this.parseStringField(status.gid, "gid"),
      status: this.parseStatusValue(status.status),
      totalLength: this.parseStringField(status.totalLength, "totalLength"),
      completedLength: this.parseStringField(
        status.completedLength,
        "completedLength",
      ),
      uploadLength: this.parseStringField(status.uploadLength, "uploadLength"),
      bitfield: this.parseOptionalStringField(status.bitfield),
      downloadSpeed: this.parseStringField(
        status.downloadSpeed,
        "downloadSpeed",
      ),
      uploadSpeed: this.parseStringField(status.uploadSpeed, "uploadSpeed"),
      infoHash: this.parseOptionalStringField(status.infoHash),
      numSeeders: this.parseOptionalStringField(status.numSeeders),
      seeder: this.parseOptionalStringField(status.seeder),
      pieceLength: this.parseOptionalStringField(status.pieceLength),
      numPieces: this.parseOptionalStringField(status.numPieces),
      connections: this.parseStringField(status.connections, "connections"),
      errorCode: this.parseOptionalStringField(status.errorCode),
      errorMessage: this.parseOptionalStringField(status.errorMessage),
      followedBy: this.parseOptionalStringArray(status.followedBy),
      following: this.parseOptionalStringField(status.following),
      belongsTo: this.parseOptionalStringField(status.belongsTo),
      dir: this.parseStringField(status.dir, "dir"),
      files: this.parseFilesArray(status.files),
      bittorrent: this.parseOptionalBittorrentInfo(status.bittorrent),
    };
  }

  /**
   * Parses array of download status objects
   * @param data - Raw response data array
   * @returns Array of parsed DownloadStatus objects
   */
  private parseDownloadStatusArray(data: unknown): DownloadStatus[] {
    if (!Array.isArray(data)) {
      throw new ValidationError("Expected array of download statuses");
    }

    return data.map((item, index) => {
      try {
        return this.parseDownloadStatus(item);
      } catch (error) {
        throw new ValidationError(
          `Invalid download status at index ${index}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    });
  }

  /**
   * Validates required fields in status response
   * @param status - Status object to validate
   */
  private validateRequiredStatusFields(status: Record<string, unknown>): void {
    const requiredFields = [
      "gid",
      "status",
      "totalLength",
      "completedLength",
      "uploadLength",
      "downloadSpeed",
      "uploadSpeed",
      "connections",
      "dir",
      "files",
    ];

    for (const field of requiredFields) {
      if (!(field in status)) {
        throw new ValidationError(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Parses string field with validation
   * @param value - Value to parse
   * @param fieldName - Field name for error messages
   * @returns Parsed string value
   */
  private parseStringField(value: unknown, fieldName: string): string {
    if (typeof value !== "string") {
      throw new ValidationError(`Field ${fieldName} must be a string`);
    }
    return value;
  }

  /**
   * Parses optional string field
   * @param value - Value to parse
   * @returns Parsed string value or undefined
   */
  private parseOptionalStringField(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value !== "string") {
      return undefined;
    }
    return value;
  }

  /**
   * Parses optional string array field
   * @param value - Value to parse
   * @returns Parsed string array or undefined
   */
  private parseOptionalStringArray(value: unknown): string[] | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      return undefined;
    }

    // Validate all elements are strings
    if (!value.every((item) => typeof item === "string")) {
      return undefined;
    }

    return value as string[];
  }

  /**
   * Parses status value with validation
   * @param value - Value to parse
   * @returns Parsed status value
   */
  private parseStatusValue(value: unknown): DownloadStatus["status"] {
    if (typeof value !== "string") {
      throw new ValidationError("Status must be a string");
    }

    const validStatuses = [
      "active",
      "waiting",
      "paused",
      "error",
      "complete",
      "removed",
    ];
    if (!validStatuses.includes(value)) {
      throw new ValidationError(`Invalid status value: ${value}`);
    }

    return value as DownloadStatus["status"];
  }

  /**
   * Parses files array with validation
   * @param value - Value to parse
   * @returns Parsed files array
   */
  private parseFilesArray(value: unknown): DownloadStatus["files"] {
    if (!Array.isArray(value)) {
      throw new ValidationError("Files must be an array");
    }

    return value.map((file, index) => {
      if (typeof file !== "object" || file === null) {
        throw new ValidationError(`File at index ${index} must be an object`);
      }

      const fileObj = file as Record<string, unknown>;

      return {
        index: this.parseStringField(fileObj.index, `files[${index}].index`),
        path: this.parseStringField(fileObj.path, `files[${index}].path`),
        length: this.parseStringField(fileObj.length, `files[${index}].length`),
        completedLength: this.parseStringField(
          fileObj.completedLength,
          `files[${index}].completedLength`,
        ),
        selected: this.parseStringField(
          fileObj.selected,
          `files[${index}].selected`,
        ),
        uris: this.parseUrisArray(fileObj.uris, index),
      };
    });
  }

  /**
   * Parses URIs array for a file
   * @param value - Value to parse
   * @param fileIndex - File index for error messages
   * @returns Parsed URIs array
   */
  private parseUrisArray(
    value: unknown,
    fileIndex: number,
  ): DownloadStatus["files"][0]["uris"] {
    if (!Array.isArray(value)) {
      throw new ValidationError(`Files[${fileIndex}].uris must be an array`);
    }

    return value.map((uri, uriIndex) => {
      if (typeof uri !== "object" || uri === null) {
        throw new ValidationError(
          `Files[${fileIndex}].uris[${uriIndex}] must be an object`,
        );
      }

      const uriObj = uri as Record<string, unknown>;

      return {
        uri: this.parseStringField(
          uriObj.uri,
          `files[${fileIndex}].uris[${uriIndex}].uri`,
        ),
        status: this.parseUriStatus(uriObj.status, fileIndex, uriIndex),
      };
    });
  }

  /**
   * Parses URI status value
   * @param value - Value to parse
   * @param fileIndex - File index for error messages
   * @param uriIndex - URI index for error messages
   * @returns Parsed URI status
   */
  private parseUriStatus(
    value: unknown,
    fileIndex: number,
    uriIndex: number,
  ): "used" | "waiting" {
    if (typeof value !== "string") {
      throw new ValidationError(
        `Files[${fileIndex}].uris[${uriIndex}].status must be a string`,
      );
    }

    if (value !== "used" && value !== "waiting") {
      throw new ValidationError(
        `Files[${fileIndex}].uris[${uriIndex}].status must be 'used' or 'waiting'`,
      );
    }

    return value;
  }

  /**
   * Parses optional BitTorrent info
   * @param value - Value to parse
   * @returns Parsed BitTorrent info or undefined
   */
  private parseOptionalBittorrentInfo(
    value: unknown,
  ): DownloadStatus["bittorrent"] {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== "object") {
      return undefined;
    }

    const btInfo = value as Record<string, unknown>;

    return {
      announceList: this.parseOptionalAnnounceList(btInfo.announceList),
      comment: this.parseOptionalStringField(btInfo.comment),
      creationDate: this.parseOptionalStringField(btInfo.creationDate),
      mode: this.parseOptionalStringField(btInfo.mode),
      info: this.parseOptionalBittorrentInfoDetails(btInfo.info),
    };
  }

  /**
   * Parses optional announce list
   * @param value - Value to parse
   * @returns Parsed announce list or undefined
   */
  private parseOptionalAnnounceList(value: unknown): string[][] | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (!Array.isArray(value)) {
      return undefined;
    }

    // Validate it's an array of string arrays
    if (
      !value.every((item) =>
        Array.isArray(item) && item.every((uri) => typeof uri === "string")
      )
    ) {
      return undefined;
    }

    return value as string[][];
  }

  /**
   * Parses optional BitTorrent info details
   * @param value - Value to parse
   * @returns Parsed info details or undefined
   */
  private parseOptionalBittorrentInfoDetails(
    value: unknown,
  ): { name: string } | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== "object") {
      return undefined;
    }

    const info = value as Record<string, unknown>;

    if (typeof info.name !== "string") {
      return undefined;
    }

    return {
      name: info.name,
    };
  }
}
