# @hitarashi/aria2

A comprehensive, type-safe Deno/JSR package for interacting with aria2 download manager through its JSON-RPC API.

[![JSR](https://jsr.io/badges/@hitarashi/aria2)](https://jsr.io/@hitarashi/aria2)
[![JSR Score](https://jsr.io/badges/@hitarashi/aria2/score)](https://jsr.io/@hitarashi/aria2)

## Features

- 🚀 **Full TypeScript Support** - Complete type safety with IntelliSense
- 📦 **Zero Dependencies** - Uses native WebSocket transport (no fetch/HTTP)
- 🎯 **Complete API Coverage** - All aria2 JSON-RPC methods supported
- 🛡️ **Robust Error Handling** - Detailed error types and user-friendly messages
- 🔧 **Flexible Configuration** - Easy setup with sensible defaults
- ⚡ **WebSocket Transport Only** - All communication uses `ws://`/`wss://` and native `WebSocket` (no HTTP or fetch)
- 📚 **Comprehensive Documentation** - JSDoc comments for all APIs
- ✅ **Well Tested** - Extensive unit and integration tests

## Installation

---

> **❗ NOTE:**
> This library now uses **WebSocket (`ws://`/`wss://`) only**.
> HTTP/HTTPS endpoints, fetch, and REST are **NOT supported** for JSON-RPC communication.
> Ensure your `aria2` instance is launched with JSON-RPC enabled and accessible via WebSocket.

---

### Using JSR (Recommended)

```bash
# Add to your deno.json imports
deno add @hitarashi/aria2
```

Or add to your `deno.json`:

```json
{
  "imports": {
    "@hitarashi/aria2": "jsr:@hitarashi/aria2@^0.0.1"
  }
}
```

### Direct Import

```typescript
import { Aria2 } from "https://jsr.io/@hitarashi/aria2/0.0.1/mod.ts";
```

## Quick Start

```typescript
import { Aria2 } from "@hitarashi/aria2";

// Create client with default configuration (localhost:6800)
const aria2 = new Aria2();

// Or with custom configuration
const aria2 = new Aria2({
  baseUrl: "ws://localhost:6800/jsonrpc", // WebSocket endpoint for aria2 JSON-RPC
  secret: "your-secret-token",
  timeout: 10000,
});

// Add a download
const gid = await aria2.addUri(["https://example.com/file.zip"]);
console.log(`Download started with GID: ${gid}`);

// Check download status
const status = await aria2.tellStatus(gid);
console.log(`Progress: ${status.completedLength}/${status.totalLength}`);

// ---
// When done, close the WebSocket connection to free resources:
aria2.close(); // After calling this, no further requests will work!
```

## Configuration

The `Aria2` constructor accepts an optional configuration object:

```typescript
interface Aria2Config {
  baseUrl?: string; // Default: "ws://localhost:6800/jsonrpc"
  secret?: string; // Default: undefined
  timeout?: number; // Default: 30000 (30 seconds)
  headers?: Record<string, string>; // Default: {}
}
```

### Examples

```typescript
// Basic configuration
const aria2 = new Aria2({
  baseUrl: "ws://192.168.1.100:6800/jsonrpc",
  secret: "mySecretToken",
});

// With custom headers and timeout
const aria2 = new Aria2({
  baseUrl: "wss://aria2.example.com/jsonrpc", // Note: Use wss:// for secure WebSocket if behind TLS
  secret: "mySecretToken",
  timeout: 60000, // 60 seconds
  headers: {
    "User-Agent": "MyApp/1.0",
  },
});
```

## API Reference

### Download Management

#### Adding Downloads

```typescript
// Add download from HTTP/HTTPS/FTP URLs
const gid = await aria2.addUri(
  [
    "https://example.com/file.zip",
    "https://mirror.example.com/file.zip", // Multiple URLs for redundancy
  ],
  {
    dir: "/downloads",
    out: "myfile.zip",
    "max-connection-per-server": 4,
  },
);

// Add torrent download
const torrentData = await Deno.readFile("./file.torrent");
const gid = await aria2.addTorrent(torrentData, [], {
  dir: "/downloads/torrents",
});

// Add metalink download
const metalinkData = await Deno.readFile("./file.metalink");
const gids = await aria2.addMetalink(metalinkData, {
  dir: "/downloads/metalink",
});
```

#### Controlling Downloads

```typescript
// Pause a download
await aria2.pause(gid);

// Resume a paused download
await aria2.unpause(gid);

// Remove a download (stops and removes from queue)
await aria2.remove(gid);

// Force remove (immediately stops and removes)
await aria2.forceRemove(gid);
```

### Status Queries

```typescript
// Get detailed status of a specific download
const status = await aria2.tellStatus(gid);
console.log({
  gid: status.gid,
  status: status.status, // 'active', 'waiting', 'paused', 'error', 'complete', 'removed'
  progress: `${status.completedLength}/${status.totalLength}`,
  speed: status.downloadSpeed,
  eta: calculateETA(
    status.totalLength,
    status.completedLength,
    status.downloadSpeed,
  ),
});

// Get only specific fields to reduce response size
const basicStatus = await aria2.tellStatus(gid, [
  "status",
  "completedLength",
  "totalLength",
]);

// Get all active downloads
const activeDownloads = await aria2.tellActive();

// Get waiting downloads with pagination
const waitingDownloads = await aria2.tellWaiting(0, 10); // offset=0, num=10

// Get stopped downloads
const stoppedDownloads = await aria2.tellStopped(0, 10);
```

### Global Configuration

```typescript
// Get current global options
const globalOptions = await aria2.getGlobalOption();
console.log(
  `Max concurrent downloads: ${globalOptions["max-concurrent-downloads"]}`,
);

// Change global options
await aria2.changeGlobalOption({
  "max-concurrent-downloads": 5,
  "max-connection-per-server": 8,
  split: 16,
});

// Get global statistics
const stats = await aria2.getGlobalStat();
console.log({
  downloadSpeed: stats.downloadSpeed,
  uploadSpeed: stats.uploadSpeed,
  numActive: stats.numActive,
  numWaiting: stats.numWaiting,
  numStopped: stats.numStopped,
});
```

### System Operations

```typescript
// Get aria2 version information
const version = await aria2.getVersion();
console.log(`aria2 version: ${version.version}`);
console.log(`Enabled features: ${version.enabledFeatures.join(", ")}`);

// Save current session
await aria2.saveSession();

// Remove completed downloads from memory
await aria2.purgeDownloadResult();

// Remove specific download from memory
await aria2.removeDownloadResult(gid);

// Shutdown aria2 (graceful)
await aria2.shutdown();

// Force shutdown aria2 (immediate)
await aria2.forceShutdown();

// ----
// New in WebSocket mode: Close the connection when finished to free resources:
aria2.close(); // This will terminate the underlying WebSocket and reject any pending requests.
// After close(), further calls on this client will fail.
```

## Error Handling

The library provides detailed error types for different failure scenarios:

```typescript
import {
  Aria2Error,
  NetworkError,
  AuthenticationError,
  JsonRpcError,
  ValidationError,
  ConfigurationError,
} from "@hitarashi/aria2";

try {
  const gid = await aria2.addUri(["https://example.com/file.zip"]);
} catch (error) {
  if (error instanceof NetworkError) {
    console.error("Network issue:", error.message);
    // Handle connection problems, timeouts, etc.
  } else if (error instanceof AuthenticationError) {
    console.error("Auth failed:", error.message);
    // Handle invalid secret token
  } else if (error instanceof JsonRpcError) {
    console.error(`aria2 error (${error.rpcCode}):`, error.message);
    // Handle aria2-specific errors
  } else if (error instanceof ValidationError) {
    console.error("Invalid parameters:", error.message);
    // Handle parameter validation errors
  } else if (error instanceof ConfigurationError) {
    console.error("Config error:", error.message);
    // Handle configuration issues
  }
}
```

### Common Error Scenarios

```typescript
// Handle specific aria2 error codes
try {
  await aria2.pause(gid);
} catch (error) {
  if (error instanceof JsonRpcError) {
    switch (error.rpcCode) {
      case 1:
        console.error("Authentication failed - check your secret");
        break;
      case 4:
        console.error("Download not found - GID may be invalid");
        break;
      case 5:
        console.error("Download cannot be paused in current state");
        break;
      default:
        console.error(`aria2 error: ${error.message}`);
    }
  }
}
```

## Advanced Usage

### Download Progress Monitoring

```typescript
async function monitorDownload(gid: string) {
  const interval = setInterval(async () => {
    try {
      const status = await aria2.tellStatus(gid);

      if (status.status === "complete") {
        console.log(`✅ Download completed: ${status.files[0]?.path}`);
        clearInterval(interval);
        return;
      }

      if (status.status === "error") {
        console.log(`❌ Download failed: ${status.errorMessage}`);
        clearInterval(interval);
        return;
      }

      const progress =
        (parseInt(status.completedLength) / parseInt(status.totalLength)) * 100;
      console.log(
        `📥 Progress: ${progress.toFixed(1)}% (${status.downloadSpeed} B/s)`,
      );
    } catch (error) {
      console.error("Error checking status:", error);
      clearInterval(interval);
    }
  }, 1000);
}

// Start monitoring
const gid = await aria2.addUri(["https://example.com/largefile.zip"]);
monitorDownload(gid);
```

### Batch Operations

```typescript
// Add multiple downloads
const urls = [
  "https://example.com/file1.zip",
  "https://example.com/file2.zip",
  "https://example.com/file3.zip",
];

const gids = await Promise.all(
  urls.map((url) => aria2.addUri([url], { dir: "/downloads" })),
);

console.log(`Started ${gids.length} downloads`);

// Monitor all downloads
const statuses = await Promise.all(
  gids.map((gid) =>
    aria2.tellStatus(gid, ["status", "completedLength", "totalLength"]),
  ),
);

statuses.forEach((status, index) => {
  const progress =
    (parseInt(status.completedLength) / parseInt(status.totalLength)) * 100;
  console.log(
    `Download ${index + 1}: ${progress.toFixed(1)}% (${status.status})`,
  );
});
```

### Custom Download Options

```typescript
// High-speed download configuration
await aria2.addUri(["https://example.com/file.zip"], {
  "max-connection-per-server": 16,
  split: 16,
  "min-split-size": "1M",
  continue: true,
  "max-concurrent-downloads": 1,
  "check-integrity": true,
  "allow-overwrite": false,
  "auto-file-renaming": true,
  "conditional-get": true,
  "enable-http-keep-alive": true,
  "enable-http-pipelining": true,
  "http-accept-gzip": true,
  "reuse-uri": true,
  "retry-wait": 10,
  timeout: 60,
  "connect-timeout": 30,
});

// BitTorrent-specific options
await aria2.addTorrent(torrentData, [], {
  "bt-max-peers": 100,
  "bt-request-peer-speed-limit": "100K",
  "bt-max-open-files": 100,
  "bt-min-crypto-level": "arc4",
  "bt-require-crypto": true,
  "bt-save-metadata": true,
  "bt-seed-unverified": false,
  "bt-stop-timeout": 0,
  "enable-dht": true,
  "enable-peer-exchange": true,
  "follow-torrent": true,
  "listen-port": "6881-6999",
  "max-upload-limit": "100K",
});
```

## Type Definitions

The library exports comprehensive TypeScript types:

```typescript
import type {
  Aria2Config,
  DownloadStatus,
  DownloadOptions,
  GlobalOptions,
  GlobalStat,
  VersionInfo,
  FileInfo,
  BitTorrentInfo,
  UriInfo,
} from "@hitarashi/aria2";

// Use types for better development experience
const config: Aria2Config = {
  baseUrl: "ws://localhost:6800/jsonrpc",
  secret: "token",
};

const options: DownloadOptions = {
  dir: "/downloads",
  "max-connection-per-server": 4,
};
```

## Requirements

- **Deno**: 1.40.0 or later
- **aria2**: 1.35.0 or later (with JSON-RPC enabled)

## aria2 Setup

Make sure aria2 is running with JSON-RPC enabled:

```bash
# Basic setup
aria2c --enable-rpc --rpc-listen-all

# With authentication
aria2c --enable-rpc --rpc-listen-all --rpc-secret=your-secret-token

# Custom port and path
aria2c --enable-rpc --rpc-listen-all --rpc-listen-port=6800 --rpc-secret=your-secret-token
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Related Projects

- [aria2](https://aria2.github.io/) - The aria2 download utility
- [aria2 JSON-RPC API](https://aria2.github.io/manual/en/html/aria2c.html#rpc-interface) - Official API documentation

---

> **ℹ️ WebSocket-Only Transport**
> All communication with aria2 is handled over WebSockets (`ws://` or `wss://`).
> You must **not** use HTTP/HTTPS URLs for the JSON-RPC endpoint.
> This package does **not** use fetch or HTTP POST.
> Example: `baseUrl: "ws://localhost:6800/jsonrpc"` (not `http://...`)
