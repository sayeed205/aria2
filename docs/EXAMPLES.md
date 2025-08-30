# Examples

This document provides practical examples for using @hitarashi/aria2 in various scenarios.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Download Management](#download-management)
- [Progress Monitoring](#progress-monitoring)
- [Error Handling](#error-handling)
- [Batch Operations](#batch-operations)
- [Advanced Configuration](#advanced-configuration)
- [Real-World Applications](#real-world-applications)

## Basic Usage

### Simple Download

```typescript
import { Aria2 } from "@hitarashi/aria2";

const aria2 = new Aria2();

// Add a download
const gid = await aria2.addUri(["https://example.com/file.zip"]);
console.log(`Download started with GID: ${gid}`);

// Check status
const status = await aria2.tellStatus(gid);
console.log(`Status: ${status.status}`);
console.log(`Progress: ${status.completedLength}/${status.totalLength}`);
```

### With Authentication

```typescript
import { Aria2 } from "@hitarashi/aria2";

const aria2 = new Aria2({
  baseUrl: "http://localhost:6800/jsonrpc",
  secret: "your-secret-token"
});

const gid = await aria2.addUri(["https://example.com/file.zip"]);
```

## Download Management

### HTTP/HTTPS Downloads

```typescript
// Basic HTTP download
const gid = await aria2.addUri(["https://example.com/file.zip"]);

// Download with multiple URLs (mirrors)
const gid = await aria2.addUri([
  "https://example.com/file.zip",
  "https://mirror1.example.com/file.zip",
  "https://mirror2.example.com/file.zip"
]);

// Download with options
const gid = await aria2.addUri(["https://example.com/largefile.zip"], {
  dir: "/downloads",
  out: "myfile.zip",
  "max-connection-per-server": 8,
  "split": 16,
  "min-split-size": "1M",
  "max-download-limit": "2M" // 2MB/s limit
});
```

### BitTorrent Downloads

```typescript
// From torrent file
const torrentData = await Deno.readFile("./ubuntu.torrent");
const gid = await aria2.addTorrent(torrentData, [], {
  dir: "/downloads/torrents",
  "bt-max-peers": 100,
  "bt-request-peer-speed-limit": "100K",
  "seed-ratio": 1.5,
  "seed-time": 3600 // seed for 1 hour
});

// With web seeds
const gid = await aria2.addTorrent(torrentData, [
  "https://releases.ubuntu.com/20.04/ubuntu-20.04.3-desktop-amd64.iso",
  "https://mirror.example.com/ubuntu-20.04.3-desktop-amd64.iso"
]);
```

### Metalink Downloads

```typescript
const metalinkData = await Deno.readFile("./files.metalink");
const gids = await aria2.addMetalink(metalinkData, {
  dir: "/downloads/metalink",
  "check-integrity": true,
  "continue": true
});

console.log(`Started ${gids.length} downloads from metalink`);
```

### Download Control

```typescript
// Pause and resume
await aria2.pause(gid);
console.log("Download paused");

await aria2.unpause(gid);
console.log("Download resumed");

// Remove downloads
await aria2.remove(gid); // Graceful removal
await aria2.forceRemove(gid); // Force removal
```

## Progress Monitoring

### Simple Progress Monitor

```typescript
async function monitorDownload(gid: string): Promise<void> {
  console.log(`Monitoring download ${gid}...`);
  
  const interval = setInterval(async () => {
    try {
      const status = await aria2.tellStatus(gid);
      
      if (status.status === "complete") {
        console.log("✅ Download completed!");
        clearInterval(interval);
        return;
      }
      
      if (status.status === "error") {
        console.log(`❌ Download failed: ${status.errorMessage}`);
        clearInterval(interval);
        return;
      }
      
      const progress = (parseInt(status.completedLength) / parseInt(status.totalLength)) * 100;
      const speed = parseInt(status.downloadSpeed);
      const speedMB = (speed / 1024 / 1024).toFixed(2);
      
      console.log(`📥 ${progress.toFixed(1)}% - ${speedMB} MB/s`);
      
    } catch (error) {
      console.error("Error monitoring download:", error);
      clearInterval(interval);
    }
  }, 2000); // Check every 2 seconds
}

// Usage
const gid = await aria2.addUri(["https://example.com/largefile.zip"]);
await monitorDownload(gid);
```

### Advanced Progress Monitor with ETA

```typescript
interface DownloadProgress {
  gid: string;
  filename: string;
  status: string;
  progress: number;
  speed: number;
  eta: number;
  totalSize: number;
  completedSize: number;
}

function calculateETA(totalLength: string, completedLength: string, downloadSpeed: string): number {
  const total = parseInt(totalLength);
  const completed = parseInt(completedLength);
  const speed = parseInt(downloadSpeed);
  
  if (speed === 0) return Infinity;
  
  const remaining = total - completed;
  return Math.round(remaining / speed);
}

function formatTime(seconds: number): string {
  if (seconds === Infinity) return "∞";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

async function getDownloadProgress(gid: string): Promise<DownloadProgress> {
  const status = await aria2.tellStatus(gid);
  
  const totalSize = parseInt(status.totalLength);
  const completedSize = parseInt(status.completedLength);
  const speed = parseInt(status.downloadSpeed);
  const progress = totalSize > 0 ? (completedSize / totalSize) * 100 : 0;
  const eta = calculateETA(status.totalLength, status.completedLength, status.downloadSpeed);
  
  return {
    gid,
    filename: status.files[0]?.path.split('/').pop() || 'Unknown',
    status: status.status,
    progress,
    speed,
    eta,
    totalSize,
    completedSize
  };
}

async function displayProgress(gid: string): Promise<void> {
  const progress = await getDownloadProgress(gid);
  
  const progressBar = '█'.repeat(Math.floor(progress.progress / 2)) + 
                     '░'.repeat(50 - Math.floor(progress.progress / 2));
  
  console.log(`
📁 ${progress.filename}
📊 [${progressBar}] ${progress.progress.toFixed(1)}%
📥 ${formatBytes(progress.completedSize)} / ${formatBytes(progress.totalSize)}
🚀 ${formatBytes(progress.speed)}/s
⏱️  ETA: ${formatTime(progress.eta)}
📋 Status: ${progress.status}
  `.trim());
}

// Usage
const gid = await aria2.addUri(["https://example.com/largefile.zip"]);

const interval = setInterval(async () => {
  try {
    await displayProgress(gid);
    
    const status = await aria2.tellStatus(gid);
    if (status.status === "complete" || status.status === "error") {
      clearInterval(interval);
    }
  } catch (error) {
    console.error("Error displaying progress:", error);
    clearInterval(interval);
  }
}, 1000);
```

### Multiple Downloads Monitor

```typescript
async function monitorMultipleDownloads(gids: string[]): Promise<void> {
  console.log(`Monitoring ${gids.length} downloads...`);
  
  const interval = setInterval(async () => {
    try {
      const statuses = await Promise.all(
        gids.map(gid => aria2.tellStatus(gid, ["gid", "status", "completedLength", "totalLength", "downloadSpeed"]))
      );
      
      console.clear();
      console.log("=== Download Status ===");
      
      let allComplete = true;
      
      for (const status of statuses) {
        const progress = (parseInt(status.completedLength) / parseInt(status.totalLength)) * 100;
        const speed = parseInt(status.downloadSpeed);
        const speedMB = (speed / 1024 / 1024).toFixed(2);
        
        const statusIcon = {
          active: "📥",
          complete: "✅",
          error: "❌",
          paused: "⏸️",
          waiting: "⏳"
        }[status.status] || "❓";
        
        console.log(`${statusIcon} ${status.gid}: ${progress.toFixed(1)}% (${speedMB} MB/s)`);
        
        if (status.status !== "complete" && status.status !== "error") {
          allComplete = false;
        }
      }
      
      if (allComplete) {
        console.log("\n🎉 All downloads completed!");
        clearInterval(interval);
      }
      
    } catch (error) {
      console.error("Error monitoring downloads:", error);
      clearInterval(interval);
    }
  }, 2000);
}
```

## Error Handling

### Comprehensive Error Handling

```typescript
import { 
  Aria2Error, 
  NetworkError, 
  AuthenticationError, 
  JsonRpcError, 
  ValidationError,
  ConfigurationError 
} from "@hitarashi/aria2";

async function robustDownload(url: string, retries = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${retries}: Starting download...`);
      const gid = await aria2.addUri([url]);
      console.log(`✅ Download started successfully: ${gid}`);
      return gid;
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (error instanceof NetworkError) {
        if (attempt < retries) {
          console.log(`🔄 Network error, retrying in 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        } else {
          console.error("🚫 Max retries reached for network error");
          return null;
        }
        
      } else if (error instanceof AuthenticationError) {
        console.error("🔐 Authentication failed - check your secret token");
        return null;
        
      } else if (error instanceof JsonRpcError) {
        switch (error.rpcCode) {
          case 1:
            console.error("🔐 aria2 authentication failed");
            return null;
          case 2:
            console.error("🚫 Method not supported by aria2 version");
            return null;
          case 3:
            console.error("📝 Invalid parameters provided");
            return null;
          default:
            console.error(`🔧 aria2 error (${error.rpcCode}): ${error.message}`);
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
            return null;
        }
        
      } else if (error instanceof ValidationError) {
        console.error("📝 Parameter validation failed:", error.message);
        return null;
        
      } else if (error instanceof ConfigurationError) {
        console.error("⚙️ Configuration error:", error.message);
        return null;
        
      } else {
        console.error("❓ Unexpected error:", error);
        return null;
      }
    }
  }
  
  return null;
}

// Usage
const gid = await robustDownload("https://example.com/file.zip");
if (gid) {
  console.log("Download started successfully!");
} else {
  console.log("Failed to start download after all retries");
}
```

### Error Recovery Strategies

```typescript
class DownloadManager {
  private aria2: Aria2;
  private failedDownloads: Map<string, number> = new Map();
  private maxRetries = 3;
  
  constructor(config?: Aria2Config) {
    this.aria2 = new Aria2(config);
  }
  
  async addDownloadWithRecovery(url: string, options?: DownloadOptions): Promise<string | null> {
    const retryCount = this.failedDownloads.get(url) || 0;
    
    if (retryCount >= this.maxRetries) {
      console.error(`Max retries exceeded for ${url}`);
      return null;
    }
    
    try {
      const gid = await this.aria2.addUri([url], options);
      this.failedDownloads.delete(url); // Reset on success
      return gid;
      
    } catch (error) {
      this.failedDownloads.set(url, retryCount + 1);
      
      if (error instanceof NetworkError) {
        console.warn(`Network error for ${url}, will retry later`);
        // Schedule retry
        setTimeout(() => this.addDownloadWithRecovery(url, options), 30000);
        return null;
        
      } else if (error instanceof JsonRpcError && error.rpcCode === 4) {
        console.error(`Download not found: ${url}`);
        return null;
        
      } else {
        console.error(`Error adding download ${url}:`, error);
        throw error;
      }
    }
  }
  
  async monitorAndRecover(gid: string): Promise<void> {
    const checkInterval = setInterval(async () => {
      try {
        const status = await this.aria2.tellStatus(gid);
        
        if (status.status === "error") {
          console.warn(`Download ${gid} failed, attempting recovery...`);
          
          // Try to restart the download
          try {
            await this.aria2.unpause(gid);
            console.log(`Restarted download ${gid}`);
          } catch (error) {
            console.error(`Failed to restart download ${gid}:`, error);
            clearInterval(checkInterval);
          }
          
        } else if (status.status === "complete") {
          console.log(`Download ${gid} completed successfully`);
          clearInterval(checkInterval);
        }
        
      } catch (error) {
        console.error(`Error monitoring download ${gid}:`, error);
        clearInterval(checkInterval);
      }
    }, 10000); // Check every 10 seconds
  }
}
```

## Batch Operations

### Parallel Downloads

```typescript
async function downloadMultipleFiles(urls: string[]): Promise<string[]> {
  console.log(`Starting ${urls.length} downloads...`);
  
  const results = await Promise.allSettled(
    urls.map(url => aria2.addUri([url]))
  );
  
  const successful: string[] = [];
  const failed: string[] = [];
  
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      successful.push(result.value);
      console.log(`✅ Started download ${index + 1}: ${result.value}`);
    } else {
      failed.push(urls[index]);
      console.error(`❌ Failed download ${index + 1}:`, result.reason.message);
    }
  });
  
  console.log(`\n📊 Results: ${successful.length} successful, ${failed.length} failed`);
  return successful;
}

// Usage
const urls = [
  "https://example.com/file1.zip",
  "https://example.com/file2.zip",
  "https://example.com/file3.zip"
];

const gids = await downloadMultipleFiles(urls);
```

### Sequential Downloads with Rate Limiting

```typescript
async function downloadSequentially(urls: string[], delayMs = 1000): Promise<string[]> {
  const gids: string[] = [];
  
  for (let i = 0; i < urls.length; i++) {
    try {
      console.log(`Starting download ${i + 1}/${urls.length}: ${urls[i]}`);
      const gid = await aria2.addUri([urls[i]]);
      gids.push(gid);
      console.log(`✅ Started: ${gid}`);
      
      // Wait before starting next download
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
    } catch (error) {
      console.error(`❌ Failed to start download ${i + 1}:`, error.message);
    }
  }
  
  return gids;
}
```

### Batch Status Monitoring

```typescript
async function monitorBatch(gids: string[]): Promise<void> {
  const startTime = Date.now();
  
  const interval = setInterval(async () => {
    try {
      const statuses = await Promise.all(
        gids.map(gid => aria2.tellStatus(gid, [
          "gid", "status", "completedLength", "totalLength", "downloadSpeed", "files"
        ]))
      );
      
      console.clear();
      console.log("=== Batch Download Status ===");
      console.log(`Runtime: ${Math.floor((Date.now() - startTime) / 1000)}s\n`);
      
      let totalCompleted = 0;
      let totalSize = 0;
      let totalSpeed = 0;
      let activeCount = 0;
      let completeCount = 0;
      let errorCount = 0;
      
      for (const status of statuses) {
        const completed = parseInt(status.completedLength);
        const total = parseInt(status.totalLength);
        const speed = parseInt(status.downloadSpeed);
        const filename = status.files[0]?.path.split('/').pop() || status.gid;
        
        totalCompleted += completed;
        totalSize += total;
        totalSpeed += speed;
        
        const progress = total > 0 ? (completed / total) * 100 : 0;
        const statusIcon = {
          active: "📥",
          complete: "✅",
          error: "❌",
          paused: "⏸️",
          waiting: "⏳"
        }[status.status] || "❓";
        
        console.log(`${statusIcon} ${filename}: ${progress.toFixed(1)}%`);
        
        switch (status.status) {
          case "active":
            activeCount++;
            break;
          case "complete":
            completeCount++;
            break;
          case "error":
            errorCount++;
            break;
        }
      }
      
      const overallProgress = totalSize > 0 ? (totalCompleted / totalSize) * 100 : 0;
      const speedMB = (totalSpeed / 1024 / 1024).toFixed(2);
      
      console.log(`\n📊 Overall: ${overallProgress.toFixed(1)}% - ${speedMB} MB/s`);
      console.log(`📈 Active: ${activeCount}, Complete: ${completeCount}, Errors: ${errorCount}`);
      
      if (activeCount === 0 && completeCount + errorCount === gids.length) {
        console.log("\n🎉 All downloads finished!");
        clearInterval(interval);
      }
      
    } catch (error) {
      console.error("Error monitoring batch:", error);
      clearInterval(interval);
    }
  }, 2000);
}
```

## Advanced Configuration

### High-Performance Downloads

```typescript
const aria2 = new Aria2({
  baseUrl: "http://localhost:6800/jsonrpc",
  secret: "your-secret-token",
  timeout: 60000 // 60 seconds for large files
});

// Configure aria2 for high-speed downloads
await aria2.changeGlobalOption({
  "max-concurrent-downloads": 8,
  "max-connection-per-server": 16,
  "split": 16,
  "min-split-size": "1M",
  "max-overall-download-limit": "0", // No limit
  "optimize-concurrent-downloads": true,
  "enable-http-keep-alive": true,
  "enable-http-pipelining": true
});

// Add download with optimized settings
const gid = await aria2.addUri(["https://example.com/largefile.zip"], {
  "max-connection-per-server": 16,
  "split": 16,
  "min-split-size": "1M",
  "continue": true,
  "retry-wait": 5,
  "max-tries": 10
});
```

### BitTorrent Optimization

```typescript
// Configure for BitTorrent downloads
await aria2.changeGlobalOption({
  "bt-max-peers": 200,
  "bt-request-peer-speed-limit": "200K",
  "bt-max-open-files": 200,
  "bt-stop-timeout": 0,
  "seed-ratio": 2.0,
  "seed-time": 7200, // 2 hours
  "enable-dht": true,
  "enable-peer-exchange": true,
  "bt-enable-lpd": true,
  "bt-hash-check-seed": true,
  "bt-seed-unverified": false
});

// Add torrent with optimization
const torrentData = await Deno.readFile("./large-torrent.torrent");
const gid = await aria2.addTorrent(torrentData, [], {
  "bt-max-peers": 200,
  "bt-request-peer-speed-limit": "200K",
  "seed-ratio": 2.0,
  "seed-time": 7200
});
```

### Proxy Configuration

```typescript
// HTTP proxy
const gid = await aria2.addUri(["https://example.com/file.zip"], {
  "http-proxy": "http://proxy.example.com:8080",
  "https-proxy": "http://proxy.example.com:8080",
  "proxy-method": "tunnel"
});

// SOCKS proxy
const gid = await aria2.addUri(["https://example.com/file.zip"], {
  "all-proxy": "socks5://127.0.0.1:1080"
});

// Proxy with authentication
const gid = await aria2.addUri(["https://example.com/file.zip"], {
  "http-proxy": "http://username:password@proxy.example.com:8080"
});
```

## Real-World Applications

### Download Queue Manager

```typescript
class DownloadQueue {
  private aria2: Aria2;
  private queue: Array<{ url: string; options?: DownloadOptions }> = [];
  private active: Map<string, string> = new Map(); // gid -> url
  private maxConcurrent = 3;
  private processing = false;
  
  constructor(config?: Aria2Config) {
    this.aria2 = new Aria2(config);
  }
  
  add(url: string, options?: DownloadOptions): void {
    this.queue.push({ url, options });
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0 || this.active.size > 0) {
      // Start new downloads if under limit
      while (this.queue.length > 0 && this.active.size < this.maxConcurrent) {
        const item = this.queue.shift()!;
        try {
          const gid = await this.aria2.addUri([item.url], item.options);
          this.active.set(gid, item.url);
          console.log(`✅ Started: ${item.url} (${gid})`);
        } catch (error) {
          console.error(`❌ Failed to start: ${item.url}`, error.message);
        }
      }
      
      // Check active downloads
      const activeGids = Array.from(this.active.keys());
      if (activeGids.length > 0) {
        const statuses = await Promise.allSettled(
          activeGids.map(gid => this.aria2.tellStatus(gid, ["gid", "status"]))
        );
        
        for (let i = 0; i < statuses.length; i++) {
          const result = statuses[i];
          const gid = activeGids[i];
          
          if (result.status === "fulfilled") {
            const status = result.value;
            if (status.status === "complete" || status.status === "error") {
              const url = this.active.get(gid)!;
              this.active.delete(gid);
              
              if (status.status === "complete") {
                console.log(`✅ Completed: ${url}`);
              } else {
                console.log(`❌ Failed: ${url}`);
              }
            }
          } else {
            // Download might have been removed
            this.active.delete(gid);
          }
        }
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    this.processing = false;
    console.log("🎉 Queue processing completed!");
  }
  
  async getStatus(): Promise<void> {
    console.log(`Queue: ${this.queue.length} waiting, ${this.active.size} active`);
    
    for (const [gid, url] of this.active) {
      try {
        const status = await this.aria2.tellStatus(gid, ["status", "completedLength", "totalLength"]);
        const progress = (parseInt(status.completedLength) / parseInt(status.totalLength)) * 100;
        console.log(`  📥 ${url}: ${progress.toFixed(1)}% (${status.status})`);
      } catch (error) {
        console.log(`  ❓ ${url}: Status unknown`);
      }
    }
  }
}

// Usage
const queue = new DownloadQueue({
  secret: "your-secret-token"
});

// Add multiple downloads
queue.add("https://example.com/file1.zip");
queue.add("https://example.com/file2.zip", { dir: "/downloads/special" });
queue.add("https://example.com/file3.zip");

// Check status periodically
setInterval(() => queue.getStatus(), 10000);
```

### Web Scraper with Download Manager

```typescript
interface DownloadItem {
  url: string;
  filename: string;
  directory: string;
}

class WebScraperDownloader {
  private aria2: Aria2;
  
  constructor(config?: Aria2Config) {
    this.aria2 = new Aria2(config);
  }
  
  async scrapeAndDownload(baseUrl: string, pattern: RegExp): Promise<void> {
    console.log(`Scraping ${baseUrl} for pattern: ${pattern}`);
    
    // Fetch the webpage
    const response = await fetch(baseUrl);
    const html = await response.text();
    
    // Extract download links
    const links = this.extractLinks(html, pattern, baseUrl);
    console.log(`Found ${links.length} download links`);
    
    // Download all files
    const gids = await this.downloadAll(links);
    
    // Monitor progress
    await this.monitorDownloads(gids);
  }
  
  private extractLinks(html: string, pattern: RegExp, baseUrl: string): DownloadItem[] {
    const links: DownloadItem[] = [];
    const matches = html.matchAll(pattern);
    
    for (const match of matches) {
      const url = new URL(match[1], baseUrl).href;
      const filename = url.split('/').pop() || `file_${Date.now()}`;
      const directory = "/downloads/scraped";
      
      links.push({ url, filename, directory });
    }
    
    return links;
  }
  
  private async downloadAll(items: DownloadItem[]): Promise<string[]> {
    const gids: string[] = [];
    
    for (const item of items) {
      try {
        const gid = await this.aria2.addUri([item.url], {
          dir: item.directory,
          out: item.filename,
          "user-agent": "Mozilla/5.0 (compatible; WebScraperBot/1.0)"
        });
        
        gids.push(gid);
        console.log(`✅ Queued: ${item.filename}`);
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Failed to queue ${item.filename}:`, error.message);
      }
    }
    
    return gids;
  }
  
  private async monitorDownloads(gids: string[]): Promise<void> {
    console.log(`Monitoring ${gids.length} downloads...`);
    
    const interval = setInterval(async () => {
      try {
        const statuses = await Promise.all(
          gids.map(gid => this.aria2.tellStatus(gid, ["gid", "status", "files"]))
        );
        
        const completed = statuses.filter(s => s.status === "complete").length;
        const active = statuses.filter(s => s.status === "active").length;
        const errors = statuses.filter(s => s.status === "error").length;
        
        console.log(`📊 Progress: ${completed}/${gids.length} complete, ${active} active, ${errors} errors`);
        
        if (completed + errors === gids.length) {
          console.log("🎉 All downloads finished!");
          clearInterval(interval);
          
          // Show results
          for (const status of statuses) {
            const filename = status.files[0]?.path.split('/').pop() || status.gid;
            const icon = status.status === "complete" ? "✅" : "❌";
            console.log(`${icon} ${filename}`);
          }
        }
        
      } catch (error) {
        console.error("Error monitoring downloads:", error);
        clearInterval(interval);
      }
    }, 5000);
  }
}

// Usage
const scraper = new WebScraperDownloader({
  secret: "your-secret-token"
});

// Scrape and download all PDF files from a webpage
await scraper.scrapeAndDownload(
  "https://example.com/documents",
  /href="([^"]*\.pdf)"/gi
);
```

### Backup System

```typescript
interface BackupConfig {
  sources: string[];
  destination: string;
  schedule?: string; // cron-like schedule
  retention?: number; // days to keep backups
}

class BackupDownloader {
  private aria2: Aria2;
  
  constructor(config?: Aria2Config) {
    this.aria2 = new Aria2(config);
  }
  
  async performBackup(config: BackupConfig): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `${config.destination}/${timestamp}`;
    
    console.log(`Starting backup to ${backupDir}`);
    
    // Create backup directory structure
    await Deno.mkdir(backupDir, { recursive: true });
    
    const gids: string[] = [];
    
    for (const source of config.sources) {
      try {
        const filename = source.split('/').pop() || `backup_${Date.now()}`;
        
        const gid = await this.aria2.addUri([source], {
          dir: backupDir,
          out: filename,
          "continue": true,
          "check-integrity": true,
          "retry-wait": 30,
          "max-tries": 5
        });
        
        gids.push(gid);
        console.log(`✅ Queued backup: ${filename}`);
        
      } catch (error) {
        console.error(`❌ Failed to queue backup for ${source}:`, error.message);
      }
    }
    
    // Monitor backup progress
    await this.monitorBackup(gids, backupDir);
    
    // Cleanup old backups if retention is set
    if (config.retention) {
      await this.cleanupOldBackups(config.destination, config.retention);
    }
  }
  
  private async monitorBackup(gids: string[], backupDir: string): Promise<void> {
    console.log(`Monitoring backup progress...`);
    
    const startTime = Date.now();
    
    const interval = setInterval(async () => {
      try {
        const statuses = await Promise.all(
          gids.map(gid => this.aria2.tellStatus(gid))
        );
        
        let totalSize = 0;
        let completedSize = 0;
        let activeCount = 0;
        let completeCount = 0;
        let errorCount = 0;
        
        for (const status of statuses) {
          totalSize += parseInt(status.totalLength);
          completedSize += parseInt(status.completedLength);
          
          switch (status.status) {
            case "active":
              activeCount++;
              break;
            case "complete":
              completeCount++;
              break;
            case "error":
              errorCount++;
              console.error(`❌ Backup failed: ${status.files[0]?.path} - ${status.errorMessage}`);
              break;
          }
        }
        
        const progress = totalSize > 0 ? (completedSize / totalSize) * 100 : 0;
        const runtime = Math.floor((Date.now() - startTime) / 1000);
        
        console.log(`📊 Backup Progress: ${progress.toFixed(1)}% (${runtime}s)`);
        console.log(`📈 Active: ${activeCount}, Complete: ${completeCount}, Errors: ${errorCount}`);
        
        if (activeCount === 0) {
          clearInterval(interval);
          
          if (errorCount === 0) {
            console.log(`✅ Backup completed successfully to ${backupDir}`);
          } else {
            console.log(`⚠️ Backup completed with ${errorCount} errors`);
          }
        }
        
      } catch (error) {
        console.error("Error monitoring backup:", error);
        clearInterval(interval);
      }
    }, 10000);
  }
  
  private async cleanupOldBackups(backupRoot: string, retentionDays: number): Promise<void> {
    try {
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      
      for await (const entry of Deno.readDir(backupRoot)) {
        if (entry.isDirectory) {
          const dirPath = `${backupRoot}/${entry.name}`;
          const stat = await Deno.stat(dirPath);
          
          if (stat.mtime && stat.mtime.getTime() < cutoffTime) {
            console.log(`🗑️ Removing old backup: ${entry.name}`);
            await Deno.remove(dirPath, { recursive: true });
          }
        }
      }
      
    } catch (error) {
      console.error("Error cleaning up old backups:", error);
    }
  }
}

// Usage
const backup = new BackupDownloader({
  secret: "your-secret-token"
});

await backup.performBackup({
  sources: [
    "https://example.com/database-backup.sql.gz",
    "https://example.com/files-backup.tar.gz",
    "https://example.com/config-backup.zip"
  ],
  destination: "/backups",
  retention: 7 // Keep backups for 7 days
});
```

These examples demonstrate the flexibility and power of the @hitarashi/aria2 library for various real-world scenarios. Each example includes proper error handling, progress monitoring, and follows best practices for production use.