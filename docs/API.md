# API Reference

This document provides a comprehensive reference for the @hitarashi/aria2 package.

## Table of Contents

- [Aria2 Class](#aria2-class)
- [Configuration](#configuration)
- [Download Management](#download-management)
- [Status Queries](#status-queries)
- [Global Configuration](#global-configuration)
- [System Operations](#system-operations)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Aria2 Class

The main client class for interacting with aria2.

### Constructor

```typescript
new Aria2(config?: Aria2Config)
```

Creates a new Aria2 client instance.

**Parameters:**
- `config` (optional): Configuration options for the client

**Throws:**
- `ConfigurationError`: When configuration is invalid
- `ValidationError`: When configuration validation fails

**Example:**
```typescript
import { Aria2 } from "@hitarashi/aria2";

// Default configuration
const aria2 = new Aria2();

// Custom configuration
const aria2 = new Aria2({
  baseUrl: "http://localhost:6800/jsonrpc",
  secret: "your-secret-token",
  timeout: 30000
});
```

## Configuration

### Aria2Config Interface

Configuration options for the Aria2 client.

```typescript
interface Aria2Config {
  baseUrl?: string;
  secret?: string;
  timeout?: number;
  headers?: Record<string, string>;
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `baseUrl` | `string` | `"http://localhost:6800/jsonrpc"` | Base URL for the aria2 JSON-RPC endpoint |
| `secret` | `string` | `undefined` | Secret token for authentication |
| `timeout` | `number` | `10000` | Request timeout in milliseconds |
| `headers` | `Record<string, string>` | `{}` | Additional HTTP headers |

**Examples:**

```typescript
// Basic configuration
const config: Aria2Config = {
  baseUrl: "http://192.168.1.100:6800/jsonrpc",
  secret: "mySecretToken"
};

// Advanced configuration
const config: Aria2Config = {
  baseUrl: "https://aria2.example.com/jsonrpc",
  secret: "mySecretToken",
  timeout: 60000,
  headers: {
    "User-Agent": "MyApp/1.0",
    "X-Custom-Header": "value"
  }
};
```

## Download Management

Methods for managing downloads in aria2.

### addUri()

Add download from URIs.

```typescript
addUri(uris: string[], options?: DownloadOptions): Promise<string>
```

**Parameters:**
- `uris`: Array of URIs to download from
- `options` (optional): Download options

**Returns:** Promise resolving to download GID

**Throws:**
- `ValidationError`: When URIs are invalid
- `NetworkError`: When network communication fails
- `JsonRpcError`: When aria2 returns an error

**Example:**
```typescript
// Basic download
const gid = await aria2.addUri(["https://example.com/file.zip"]);

// Download with options
const gid = await aria2.addUri([
  "https://example.com/file.zip",
  "https://mirror.example.com/file.zip"
], {
  dir: "/downloads",
  out: "myfile.zip",
  "max-connection-per-server": 4
});
```

### addTorrent()

Add download from torrent data.

```typescript
addTorrent(torrent: string | Uint8Array, uris?: string[], options?: DownloadOptions): Promise<string>
```

**Parameters:**
- `torrent`: Torrent file data as base64 string or Uint8Array
- `uris` (optional): Array of web seed URIs
- `options` (optional): Download options

**Returns:** Promise resolving to download GID

**Example:**
```typescript
const torrentData = await Deno.readFile("./file.torrent");
const gid = await aria2.addTorrent(torrentData, [], {
  dir: "/downloads/torrents",
  "bt-max-peers": 100
});
```

### addMetalink()

Add download from metalink data.

```typescript
addMetalink(metalink: string | Uint8Array, options?: DownloadOptions): Promise<string[]>
```

**Parameters:**
- `metalink`: Metalink file data as base64 string or Uint8Array
- `options` (optional): Download options

**Returns:** Promise resolving to array of download GIDs

### pause()

Pause a download.

```typescript
pause(gid: string): Promise<string>
```

**Parameters:**
- `gid`: Download GID to pause

**Returns:** Promise resolving to the GID of paused download

### unpause()

Resume a paused download.

```typescript
unpause(gid: string): Promise<string>
```

**Parameters:**
- `gid`: Download GID to unpause

**Returns:** Promise resolving to the GID of unpaused download

### remove()

Remove a download.

```typescript
remove(gid: string): Promise<string>
```

**Parameters:**
- `gid`: Download GID to remove

**Returns:** Promise resolving to the GID of removed download

### forceRemove()

Force remove a download.

```typescript
forceRemove(gid: string): Promise<string>
```

**Parameters:**
- `gid`: Download GID to force remove

**Returns:** Promise resolving to the GID of removed download

## Status Queries

Methods for querying download status information.

### tellStatus()

Get download progress information for a specific GID.

```typescript
tellStatus(gid: string, keys?: string[]): Promise<DownloadStatus>
```

**Parameters:**
- `gid`: Download GID
- `keys` (optional): Array of keys to retrieve (filters response)

**Returns:** Promise resolving to download status

**Example:**
```typescript
// Get full status
const status = await aria2.tellStatus(gid);

// Get specific fields only
const status = await aria2.tellStatus(gid, [
  "status", "completedLength", "totalLength", "downloadSpeed"
]);
```

### tellActive()

Get list of active downloads.

```typescript
tellActive(keys?: string[]): Promise<DownloadStatus[]>
```

**Parameters:**
- `keys` (optional): Array of keys to retrieve (filters response)

**Returns:** Promise resolving to array of active download statuses

### tellWaiting()

Get list of waiting downloads.

```typescript
tellWaiting(offset: number, num: number, keys?: string[]): Promise<DownloadStatus[]>
```

**Parameters:**
- `offset`: Offset from the beginning of the waiting queue
- `num`: Number of downloads to retrieve (max 1000)
- `keys` (optional): Array of keys to retrieve (filters response)

**Returns:** Promise resolving to array of waiting download statuses

### tellStopped()

Get list of stopped downloads.

```typescript
tellStopped(offset: number, num: number, keys?: string[]): Promise<DownloadStatus[]>
```

**Parameters:**
- `offset`: Offset from the beginning of the stopped queue
- `num`: Number of downloads to retrieve (max 1000)
- `keys` (optional): Array of keys to retrieve (filters response)

**Returns:** Promise resolving to array of stopped download statuses

## Global Configuration

Methods for managing global aria2 configuration.

### getGlobalOption()

Get global options.

```typescript
getGlobalOption(): Promise<GlobalOptions>
```

**Returns:** Promise resolving to global options object

### changeGlobalOption()

Change global options.

```typescript
changeGlobalOption(options: Partial<GlobalOptions>): Promise<string>
```

**Parameters:**
- `options`: Global options to change

**Returns:** Promise resolving to "OK" on success

**Example:**
```typescript
await aria2.changeGlobalOption({
  "max-concurrent-downloads": 5,
  "max-connection-per-server": 8,
  "split": 16
});
```

### getGlobalStat()

Get global statistics.

```typescript
getGlobalStat(): Promise<GlobalStat>
```

**Returns:** Promise resolving to global statistics

## System Operations

Methods for system information and control.

### getVersion()

Get aria2 version information.

```typescript
getVersion(): Promise<VersionInfo>
```

**Returns:** Promise resolving to version information

### shutdown()

Shutdown aria2 server gracefully.

```typescript
shutdown(): Promise<string>
```

**Returns:** Promise resolving to "OK" on success

### forceShutdown()

Force shutdown aria2 server immediately.

```typescript
forceShutdown(): Promise<string>
```

**Returns:** Promise resolving to "OK" on success

### saveSession()

Save session information.

```typescript
saveSession(): Promise<string>
```

**Returns:** Promise resolving to "OK" on success

### purgeDownloadResult()

Purge completed/error/removed downloads to free memory.

```typescript
purgeDownloadResult(): Promise<string>
```

**Returns:** Promise resolving to "OK" on success

### removeDownloadResult()

Remove specific download from memory.

```typescript
removeDownloadResult(gid: string): Promise<string>
```

**Parameters:**
- `gid`: Download GID to remove from memory

**Returns:** Promise resolving to "OK" on success

## Type Definitions

### DownloadStatus

Complete download status information from aria2.

```typescript
interface DownloadStatus {
  gid: string;
  status: 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed';
  totalLength: string;
  completedLength: string;
  uploadLength: string;
  bitfield?: string;
  downloadSpeed: string;
  uploadSpeed: string;
  infoHash?: string;
  numSeeders?: string;
  seeder?: string;
  pieceLength?: string;
  numPieces?: string;
  connections: string;
  errorCode?: string;
  errorMessage?: string;
  followedBy?: string[];
  following?: string;
  belongsTo?: string;
  dir: string;
  files: FileInfo[];
  bittorrent?: BitTorrentInfo;
}
```

### DownloadOptions

Download options that can be passed to aria2 methods.

```typescript
interface DownloadOptions {
  dir?: string;
  out?: string;
  split?: number;
  "max-connection-per-server"?: number;
  "min-split-size"?: string;
  continue?: boolean;
  "max-concurrent-downloads"?: number;
  "check-integrity"?: boolean;
  "allow-overwrite"?: boolean;
  // ... many more options
}
```

**Common Options:**

| Option | Type | Description |
|--------|------|-------------|
| `dir` | `string` | Directory to store downloaded files |
| `out` | `string` | Output filename |
| `split` | `number` | Number of connections to use per server |
| `"max-connection-per-server"` | `number` | Maximum connections per server |
| `"min-split-size"` | `string` | Minimum split size (e.g., "1M") |
| `continue` | `boolean` | Continue partial download |
| `"check-integrity"` | `boolean` | Check file integrity |
| `"max-download-limit"` | `string` | Maximum download speed (e.g., "1M") |

### GlobalOptions

Global options that affect aria2 behavior system-wide.

```typescript
interface GlobalOptions extends DownloadOptions {
  "bt-max-peers"?: number;
  "bt-request-peer-speed-limit"?: string;
  "max-overall-download-limit"?: string;
  "max-overall-upload-limit"?: string;
  "log-level"?: "debug" | "info" | "notice" | "warn" | "error";
  // ... many more options
}
```

### GlobalStat

Global statistics from aria2.

```typescript
interface GlobalStat {
  downloadSpeed: string;
  uploadSpeed: string;
  numActive: string;
  numWaiting: string;
  numStopped: string;
  numStoppedTotal: string;
}
```

### VersionInfo

Version information from aria2.

```typescript
interface VersionInfo {
  version: string;
  enabledFeatures: string[];
}
```

### FileInfo

File information within a download.

```typescript
interface FileInfo {
  index: string;
  path: string;
  length: string;
  completedLength: string;
  selected: string;
  uris: UriInfo[];
}
```

### UriInfo

URI information for a file.

```typescript
interface UriInfo {
  uri: string;
  status: "used" | "waiting";
}
```

### BitTorrentInfo

BitTorrent-specific information.

```typescript
interface BitTorrentInfo {
  announceList?: string[][];
  comment?: string;
  creationDate?: string;
  mode?: string;
  info?: {
    name: string;
  };
}
```

## Error Handling

The library provides detailed error types for different failure scenarios.

### Error Hierarchy

```
Aria2Error (abstract base class)
├── NetworkError
├── AuthenticationError
├── JsonRpcError
├── ValidationError
└── ConfigurationError
```

### Aria2Error

Base class for all aria2-related errors.

```typescript
abstract class Aria2Error extends Error {
  abstract readonly code: string;
}
```

### NetworkError

Network-related errors (connection failures, timeouts, etc.).

```typescript
class NetworkError extends Aria2Error {
  readonly code = "NETWORK_ERROR";
}
```

**Common scenarios:**
- Connection timeout
- Connection refused
- DNS resolution failure
- HTTP errors (404, 500, etc.)

### AuthenticationError

Authentication errors (invalid secret, unauthorized access).

```typescript
class AuthenticationError extends Aria2Error {
  readonly code = "AUTH_ERROR";
}
```

**Common scenarios:**
- Invalid secret token
- Missing authentication
- HTTP 401/403 responses

### JsonRpcError

JSON-RPC protocol errors from aria2.

```typescript
class JsonRpcError extends Aria2Error {
  readonly code = "JSONRPC_ERROR";
  readonly rpcCode: number;
  readonly rpcData?: unknown;
}
```

**Common RPC error codes:**
- `1`: Authentication failed
- `2`: Invalid method
- `3`: Invalid parameters
- `4`: Download not found
- `5`: Cannot pause download
- `6`: Cannot resume download
- `7`: Cannot remove download

### ValidationError

Parameter validation errors.

```typescript
class ValidationError extends Aria2Error {
  readonly code = "VALIDATION_ERROR";
}
```

**Common scenarios:**
- Invalid URIs
- Invalid GID format
- Invalid parameter types
- Missing required parameters

### ConfigurationError

Configuration errors.

```typescript
class ConfigurationError extends Aria2Error {
  readonly code = "CONFIG_ERROR";
}
```

**Common scenarios:**
- Invalid baseUrl
- Invalid timeout value
- Invalid headers

### Error Handling Examples

```typescript
import { 
  Aria2Error, 
  NetworkError, 
  AuthenticationError, 
  JsonRpcError, 
  ValidationError 
} from "@hitarashi/aria2";

try {
  const gid = await aria2.addUri(["https://example.com/file.zip"]);
} catch (error) {
  if (error instanceof NetworkError) {
    console.error("Network issue:", error.message);
    // Retry logic, check connection, etc.
  } else if (error instanceof AuthenticationError) {
    console.error("Auth failed:", error.message);
    // Check secret token configuration
  } else if (error instanceof JsonRpcError) {
    console.error(`aria2 error (${error.rpcCode}):`, error.message);
    switch (error.rpcCode) {
      case 1:
        console.error("Check your secret token");
        break;
      case 4:
        console.error("Download not found");
        break;
    }
  } else if (error instanceof ValidationError) {
    console.error("Invalid parameters:", error.message);
    // Fix parameter validation issues
  }
}
```

## Best Practices

### Connection Management

```typescript
// Use a single client instance for multiple operations
const aria2 = new Aria2({
  baseUrl: "http://localhost:6800/jsonrpc",
  secret: "your-secret-token",
  timeout: 30000
});

// Reuse the client for multiple downloads
const gid1 = await aria2.addUri(["https://example.com/file1.zip"]);
const gid2 = await aria2.addUri(["https://example.com/file2.zip"]);
```

### Error Handling

```typescript
// Always handle errors appropriately
try {
  const gid = await aria2.addUri(uris, options);
  return gid;
} catch (error) {
  if (error instanceof ValidationError) {
    // Log and fix parameter issues
    console.error("Parameter validation failed:", error.message);
    throw error;
  } else if (error instanceof NetworkError) {
    // Implement retry logic
    console.warn("Network error, retrying...", error.message);
    // ... retry logic
  } else {
    // Handle other errors
    console.error("Unexpected error:", error);
    throw error;
  }
}
```

### Progress Monitoring

```typescript
async function monitorDownload(gid: string): Promise<void> {
  const interval = setInterval(async () => {
    try {
      const status = await aria2.tellStatus(gid, [
        "status", "completedLength", "totalLength", "downloadSpeed"
      ]);
      
      if (status.status === "complete") {
        console.log("✅ Download completed");
        clearInterval(interval);
        return;
      }
      
      if (status.status === "error") {
        console.log("❌ Download failed");
        clearInterval(interval);
        return;
      }
      
      const progress = (parseInt(status.completedLength) / parseInt(status.totalLength)) * 100;
      console.log(`📥 ${progress.toFixed(1)}% (${status.downloadSpeed} B/s)`);
      
    } catch (error) {
      console.error("Error monitoring download:", error);
      clearInterval(interval);
    }
  }, 1000);
}
```

### Batch Operations

```typescript
// Process multiple downloads efficiently
async function addMultipleDownloads(urls: string[]): Promise<string[]> {
  const results = await Promise.allSettled(
    urls.map(url => aria2.addUri([url]))
  );
  
  const successful: string[] = [];
  const failed: string[] = [];
  
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      successful.push(result.value);
    } else {
      failed.push(urls[index]);
      console.error(`Failed to add ${urls[index]}:`, result.reason);
    }
  });
  
  console.log(`Added ${successful.length} downloads, ${failed.length} failed`);
  return successful;
}
```

### Resource Management

```typescript
// Clean up completed downloads periodically
async function cleanupCompletedDownloads(): Promise<void> {
  try {
    // Get stopped downloads
    const stopped = await aria2.tellStopped(0, 100, ["gid", "status"]);
    
    // Remove completed downloads from memory
    const completed = stopped.filter(d => d.status === "complete");
    await Promise.all(
      completed.map(d => aria2.removeDownloadResult(d.gid))
    );
    
    console.log(`Cleaned up ${completed.length} completed downloads`);
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}
```

### Configuration Best Practices

```typescript
// Use environment variables for configuration
const aria2 = new Aria2({
  baseUrl: Deno.env.get("ARIA2_URL") || "http://localhost:6800/jsonrpc",
  secret: Deno.env.get("ARIA2_SECRET"),
  timeout: parseInt(Deno.env.get("ARIA2_TIMEOUT") || "30000"),
  headers: {
    "User-Agent": `MyApp/${Deno.env.get("APP_VERSION") || "1.0"}`
  }
});

// Validate configuration at startup
try {
  const version = await aria2.getVersion();
  console.log(`Connected to aria2 ${version.version}`);
} catch (error) {
  console.error("Failed to connect to aria2:", error);
  Deno.exit(1);
}
```