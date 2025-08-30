/**
 * Configuration options for the Aria2 client
 */
export interface Aria2Config {
  /** Base URL for the aria2 JSON-RPC endpoint. Defaults to 'http://localhost:6800/jsonrpc' */
  baseUrl?: string;
  
  /** Secret token for authentication with aria2 */
  secret?: string;
  
  /** Request timeout in milliseconds. Defaults to 10000 (10 seconds) */
  timeout?: number;
  
  /** Additional HTTP headers to include with requests */
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
  baseUrl: 'http://localhost:6800/jsonrpc',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};