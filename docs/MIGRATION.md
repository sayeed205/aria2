# Migration Guide

This guide helps you migrate to @hitarashi/aria2 from other aria2 clients or upgrade between versions.

## Table of Contents

- [From aria2 CLI to @hitarashi/aria2](#from-aria2-cli-to-hitarashiaria2)
- [From Other JavaScript/TypeScript Libraries](#from-other-javascripttypescript-libraries)
- [Version Upgrades](#version-upgrades)
- [Common Migration Issues](#common-migration-issues)

## From aria2 CLI to @hitarashi/aria2

If you're currently using aria2 command-line interface and want to integrate it into a Deno application, here's how to migrate common operations.

### Starting aria2 with JSON-RPC

First, ensure aria2 is running with JSON-RPC enabled:

```bash
# Basic setup
aria2c --enable-rpc --rpc-listen-all

# With authentication (recommended)
aria2c --enable-rpc --rpc-listen-all --rpc-secret=your-secret-token

# Custom port
aria2c --enable-rpc --rpc-listen-all --rpc-listen-port=6800 --rpc-secret=your-secret-token
```

### CLI to API Mapping

| CLI Command | API Method | Example |
|-------------|------------|---------|
| `aria2c "https://example.com/file.zip"` | `addUri()` | `await aria2.addUri(["https://example.com/file.zip"])` |
| `aria2c --dir=/downloads "https://example.com/file.zip"` | `addUri()` with options | `await aria2.addUri(["https://example.com/file.zip"], { dir: "/downloads" })` |
| `aria2c "file.torrent"` | `addTorrent()` | `await aria2.addTorrent(torrentData)` |
| `aria2c --pause` | `pause()` | `await aria2.pause(gid)` |
| Check download status | `tellStatus()` | `await aria2.tellStatus(gid)` |

### Example Migration

**Before (CLI script):**
```bash
#!/bin/bash
aria2c --dir=/downloads \
       --max-connection-per-server=4 \
       --split=8 \
       "https://example.com/file.zip"
```

**After (Deno script):**
```typescript
import { Aria2 } from "@hitarashi/aria2";

const aria2 = new Aria2({
  baseUrl: "http://localhost:6800/jsonrpc",
  secret: "your-secret-token"
});

const gid = await aria2.addUri(["https://example.com/file.zip"], {
  dir: "/downloads",
  "max-connection-per-server": 4,
  split: 8
});

console.log(`Download started with GID: ${gid}`);
```

## From Other JavaScript/TypeScript Libraries

### From node-aria2

If you're migrating from `node-aria2` or similar Node.js libraries:

**Before (node-aria2):**
```javascript
const Aria2 = require('aria2');
const aria2 = new Aria2({
  host: 'localhost',
  port: 6800,
  secure: false,
  secret: 'your-secret-token'
});

aria2.call('addUri', ['https://example.com/file.zip'], (err, res) => {
  if (err) {
    console.error(err);
  } else {
    console.log('GID:', res);
  }
});
```

**After (@hitarashi/aria2):**
```typescript
import { Aria2 } from "@hitarashi/aria2";

const aria2 = new Aria2({
  baseUrl: "http://localhost:6800/jsonrpc",
  secret: "your-secret-token"
});

try {
  const gid = await aria2.addUri(["https://example.com/file.zip"]);
  console.log("GID:", gid);
} catch (error) {
  console.error(error);
}
```

**Key differences:**
- Uses modern async/await instead of callbacks
- Full TypeScript support with type safety
- Simplified configuration (single `baseUrl` instead of separate host/port)
- Built-in error handling with specific error types
- No need for manual JSON-RPC method calls

### From aria2.js

**Before (aria2.js):**
```javascript
import Aria2 from 'aria2.js';

const aria2 = new Aria2({
  WebSocket: 'ws://localhost:6800/jsonrpc'
});

aria2.send('addUri', [['https://example.com/file.zip']])
  .then(gid => console.log('GID:', gid))
  .catch(err => console.error(err));
```

**After (@hitarashi/aria2):**
```typescript
import { Aria2 } from "@hitarashi/aria2";

const aria2 = new Aria2({
  baseUrl: "http://localhost:6800/jsonrpc"
});

try {
  const gid = await aria2.addUri(["https://example.com/file.zip"]);
  console.log("GID:", gid);
} catch (error) {
  console.error(error);
}
```

**Key differences:**
- Uses HTTP instead of WebSocket (more reliable for most use cases)
- Method names match aria2 API directly (`addUri` instead of generic `send`)
- Better error handling with typed exceptions
- No need to wrap parameters in arrays

## Version Upgrades

### From 0.0.1 to Future Versions

Currently, this is the initial version. Future migration guides will be added here as new versions are released.

### Breaking Changes Policy

This library follows semantic versioning:
- **Patch versions** (0.0.x): Bug fixes, no breaking changes
- **Minor versions** (0.x.0): New features, backward compatible
- **Major versions** (x.0.0): Breaking changes

## Common Migration Issues

### Configuration Issues

**Issue:** Connection refused or timeout errors

**Solution:** Verify aria2 is running with JSON-RPC enabled:
```bash
# Check if aria2 is running
ps aux | grep aria2

# Test JSON-RPC endpoint
curl -X POST http://localhost:6800/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"aria2.getVersion","id":"1"}'
```

**Issue:** Authentication errors

**Solution:** Ensure secret token matches:
```typescript
// Make sure this matches your aria2 --rpc-secret
const aria2 = new Aria2({
  secret: "your-secret-token"
});
```

### Type Safety Issues

**Issue:** TypeScript compilation errors

**Solution:** Ensure you're importing types correctly:
```typescript
import { Aria2, type DownloadOptions, type DownloadStatus } from "@hitarashi/aria2";

const options: DownloadOptions = {
  dir: "/downloads",
  "max-connection-per-server": 4
};
```

**Issue:** Runtime type errors

**Solution:** The library validates parameters at runtime:
```typescript
try {
  await aria2.addUri(["invalid-url"]);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("Invalid URL:", error.message);
  }
}
```

### Error Handling Migration

**Before (generic error handling):**
```javascript
aria2.call('addUri', ['https://example.com/file.zip'])
  .catch(err => {
    console.error('Something went wrong:', err.message);
  });
```

**After (specific error handling):**
```typescript
try {
  await aria2.addUri(["https://example.com/file.zip"]);
} catch (error) {
  if (error instanceof NetworkError) {
    console.error("Network issue:", error.message);
  } else if (error instanceof AuthenticationError) {
    console.error("Auth failed:", error.message);
  } else if (error instanceof JsonRpcError) {
    console.error(`aria2 error (${error.rpcCode}):`, error.message);
  } else if (error instanceof ValidationError) {
    console.error("Invalid parameters:", error.message);
  }
}
```

### Async/Await Migration

**Before (callbacks):**
```javascript
aria2.call('addUri', ['https://example.com/file.zip'], (err, gid) => {
  if (err) return console.error(err);
  
  aria2.call('tellStatus', [gid], (err, status) => {
    if (err) return console.error(err);
    console.log('Status:', status.status);
  });
});
```

**After (async/await):**
```typescript
try {
  const gid = await aria2.addUri(["https://example.com/file.zip"]);
  const status = await aria2.tellStatus(gid);
  console.log("Status:", status.status);
} catch (error) {
  console.error(error);
}
```

### Batch Operations Migration

**Before (sequential):**
```javascript
const urls = ['url1', 'url2', 'url3'];
const gids = [];

for (const url of urls) {
  const gid = await aria2.call('addUri', [url]);
  gids.push(gid);
}
```

**After (parallel):**
```typescript
const urls = ['url1', 'url2', 'url3'];
const gids = await Promise.all(
  urls.map(url => aria2.addUri([url]))
);
```

## Best Practices for Migration

### 1. Start with a Simple Test

Before migrating your entire application, create a simple test:

```typescript
import { Aria2 } from "@hitarashi/aria2";

async function testConnection() {
  const aria2 = new Aria2({
    baseUrl: "http://localhost:6800/jsonrpc",
    secret: "your-secret-token"
  });

  try {
    const version = await aria2.getVersion();
    console.log(`✅ Connected to aria2 ${version.version}`);
    return true;
  } catch (error) {
    console.error("❌ Connection failed:", error);
    return false;
  }
}

if (await testConnection()) {
  console.log("Ready to migrate!");
}
```

### 2. Migrate Incrementally

Don't migrate everything at once. Start with:
1. Connection and configuration
2. Basic download operations
3. Status monitoring
4. Error handling
5. Advanced features

### 3. Use TypeScript Features

Take advantage of TypeScript features:
```typescript
// Use interfaces for better type safety
interface DownloadConfig {
  url: string;
  directory: string;
  filename?: string;
}

async function downloadFile(config: DownloadConfig): Promise<string> {
  const options: DownloadOptions = {
    dir: config.directory,
    ...(config.filename && { out: config.filename })
  };

  return await aria2.addUri([config.url], options);
}
```

### 4. Implement Proper Error Handling

```typescript
import { 
  Aria2Error, 
  NetworkError, 
  AuthenticationError, 
  JsonRpcError 
} from "@hitarashi/aria2";

async function robustDownload(url: string): Promise<string | null> {
  try {
    return await aria2.addUri([url]);
  } catch (error) {
    if (error instanceof NetworkError) {
      console.warn("Network issue, will retry later");
      return null;
    } else if (error instanceof AuthenticationError) {
      console.error("Authentication failed, check configuration");
      throw error;
    } else if (error instanceof JsonRpcError && error.rpcCode === 1) {
      console.error("aria2 authentication failed");
      throw error;
    } else {
      console.error("Unexpected error:", error);
      throw error;
    }
  }
}
```

### 5. Test Thoroughly

Create comprehensive tests for your migration:
```typescript
import { assertEquals, assertRejects } from "@std/assert";

Deno.test("aria2 client basic functionality", async () => {
  const aria2 = new Aria2();
  
  // Test connection
  const version = await aria2.getVersion();
  assertEquals(typeof version.version, "string");
  
  // Test invalid GID handling
  await assertRejects(
    () => aria2.tellStatus("invalid-gid"),
    ValidationError
  );
});
```

## Getting Help

If you encounter issues during migration:

1. **Check the API Reference**: See [API.md](./API.md) for detailed documentation
2. **Review Examples**: Check the README for usage examples
3. **Enable Debug Logging**: Use aria2's debug mode to see what's happening
4. **Test with curl**: Verify your aria2 setup works with direct HTTP calls
5. **Check aria2 Logs**: Look at aria2's log output for server-side issues

## Migration Checklist

- [ ] aria2 is running with JSON-RPC enabled
- [ ] Secret token is configured correctly
- [ ] Basic connection test passes
- [ ] Core download operations work
- [ ] Error handling is implemented
- [ ] Status monitoring is working
- [ ] All tests pass
- [ ] Performance is acceptable
- [ ] Documentation is updated