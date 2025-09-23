import { ConfigurationError } from "./errors.ts";

/**
 * Configuration options for the Aria2 client
 *
 * @example Basic configuration
 * ```typescript
 * const config: Aria2Config = {
 *   baseUrl: "http://localhost:6800/jsonrpc",
 *   secret: "mySecretToken"
 * };
 * ```
 *
 * @example Advanced configuration
 * ```typescript
 * const config: Aria2Config = {
 *   baseUrl: "https://aria2.example.com/jsonrpc",
 *   secret: "mySecretToken",
 *   timeout: 60000, // 60 seconds
 *   headers: {
 *     "User-Agent": "MyApp/1.0",
 *     "X-Custom-Header": "value"
 *   }
 * };
 * ```
 */
export interface Aria2Config {
  /**
   * Base URL for the aria2 JSON-RPC endpoint.
   * @default "http://localhost:6800/jsonrpc"
   * @example "http://192.168.1.100:6800/jsonrpc"
   */
  baseUrl?: string;

  /**
   * Secret token for authentication with aria2.
   * Must match the --rpc-secret option used when starting aria2.
   * @example "mySecretToken123"
   */
  secret?: string;

  /**
   * Request timeout in milliseconds.
   * @default 10000
   * @example 30000 // 30 seconds
   */
  timeout?: number;

  /**
   * Additional HTTP headers to include with requests.
   * @example { "User-Agent": "MyApp/1.0", "Authorization": "Bearer token" }
   */
  headers?: Record<string, string>;
}

/**
 * Internal configuration with all required fields
 */
export interface RequiredAria2Config {
  baseUrl: string;
  secret?: string;
  timeout: number;
  headers: Record<string, string>;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: RequiredAria2Config = {
  baseUrl: "http://localhost:6800/jsonrpc",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
};

/**
 * Validates and normalizes aria2 configuration
 * @param config - User-provided configuration
 * @returns Validated configuration with defaults applied
 * @throws {ConfigurationError} When configuration is invalid
 */
export function validateConfig(config: Aria2Config = {}): RequiredAria2Config {
  const result: RequiredAria2Config = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Validate baseUrl
  if (config.baseUrl !== undefined) {
    try {
      new URL(config.baseUrl);
    } catch {
      throw new ConfigurationError(`Invalid baseUrl: ${config.baseUrl}`);
    }
  }

  // Validate timeout
  if (config.timeout !== undefined) {
    if (!Number.isInteger(config.timeout) || config.timeout <= 0) {
      throw new ConfigurationError(
        `Timeout must be a positive integer, got: ${config.timeout}`,
      );
    }
  }

  // Validate headers
  if (config.headers !== undefined) {
    if (typeof config.headers !== "object" || config.headers === null) {
      throw new ConfigurationError("Headers must be an object");
    }

    for (const [key, value] of Object.entries(config.headers)) {
      if (typeof key !== "string" || typeof value !== "string") {
        throw new ConfigurationError("Header keys and values must be strings");
      }
    }

    // Merge with default headers
    result.headers = { ...DEFAULT_CONFIG.headers, ...config.headers };
  }

  return result;
}
