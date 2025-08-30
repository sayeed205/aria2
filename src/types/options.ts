/**
 * Download options that can be passed to aria2 methods
 */
export interface DownloadOptions {
  /** Directory to store downloaded files */
  dir?: string;
  /** Output filename */
  out?: string;
  /** Number of connections to use per server */
  split?: number;
  /** Maximum connections per server */
  'max-connection-per-server'?: number;
  /** Minimum split size */
  'min-split-size'?: string;
  /** Continue partial download */
  continue?: boolean;
  /** Maximum concurrent downloads */
  'max-concurrent-downloads'?: number;
  /** Check file integrity */
  'check-integrity'?: boolean;
  /** Allow overwriting existing files */
  'allow-overwrite'?: boolean;
  /** Auto file renaming */
  'auto-file-renaming'?: boolean;
  /** Conditional download */
  'conditional-get'?: boolean;
  /** Maximum download speed */
  'max-download-limit'?: string;
  /** Resume download */
  'parameterized-uri'?: boolean;
  /** Referer */
  referer?: string;
  /** User agent */
  'user-agent'?: string;
  /** HTTP headers */
  header?: string[];
  /** HTTP proxy */
  'http-proxy'?: string;
  /** HTTPS proxy */
  'https-proxy'?: string;
  /** FTP proxy */
  'ftp-proxy'?: string;
  /** All proxy */
  'all-proxy'?: string;
  /** No proxy */
  'no-proxy'?: string;
  /** Proxy method */
  'proxy-method'?: string;
  /** Remote time */
  'remote-time'?: boolean;
  /** Reuse URI */
  'reuse-uri'?: boolean;
  /** Retry wait */
  'retry-wait'?: number;
  /** Server stat of */
  'server-stat-of'?: string;
  /** Server stat if */
  'server-stat-if'?: string;
  /** Server stat timeout */
  'server-stat-timeout'?: number;
  /** Timeout */
  timeout?: number;
  /** URI selector */
  'uri-selector'?: string;
}

/**
 * Global options that affect aria2 behavior system-wide
 */
export interface GlobalOptions extends DownloadOptions {
  /** BitTorrent maximum peers */
  'bt-max-peers'?: number;
  /** BitTorrent request peer speed limit */
  'bt-request-peer-speed-limit'?: string;
  /** BitTorrent maximum open files */
  'bt-max-open-files'?: number;
  /** BitTorrent tracker connect timeout */
  'bt-tracker-connect-timeout'?: number;
  /** BitTorrent tracker interval */
  'bt-tracker-interval'?: number;
  /** BitTorrent tracker timeout */
  'bt-tracker-timeout'?: number;
  /** BitTorrent stop timeout */
  'bt-stop-timeout'?: number;
  /** BitTorrent seed unverified */
  'bt-seed-unverified'?: boolean;
  /** BitTorrent hash check seed */
  'bt-hash-check-seed'?: boolean;
  /** BitTorrent max upload limit */
  'bt-max-upload-limit'?: string;
  /** BitTorrent seed ratio */
  'seed-ratio'?: number;
  /** BitTorrent seed time */
  'seed-time'?: number;
  /** Follow torrent */
  'follow-torrent'?: boolean;
  /** Listen port */
  'listen-port'?: string;
  /** DHT listen port */
  'dht-listen-port'?: string;
  /** DHT entry point */
  'dht-entry-point'?: string;
  /** DHT entry point6 */
  'dht-entry-point6'?: string;
  /** DHT file path */
  'dht-file-path'?: string;
  /** DHT file path6 */
  'dht-file-path6'?: string;
  /** DHT message timeout */
  'dht-message-timeout'?: number;
  /** Enable DHT */
  'enable-dht'?: boolean;
  /** Enable DHT6 */
  'enable-dht6'?: boolean;
  /** Enable peer exchange */
  'enable-peer-exchange'?: boolean;
  /** Peer ID prefix */
  'peer-id-prefix'?: string;
  /** RPC listen all */
  'rpc-listen-all'?: boolean;
  /** RPC listen port */
  'rpc-listen-port'?: number;
  /** RPC max request size */
  'rpc-max-request-size'?: string;
  /** RPC save upload metadata */
  'rpc-save-upload-metadata'?: boolean;
  /** RPC secure */
  'rpc-secure'?: boolean;
  /** Log level */
  'log-level'?: 'debug' | 'info' | 'notice' | 'warn' | 'error';
  /** Log file */
  log?: string;
  /** Max overall download limit */
  'max-overall-download-limit'?: string;
  /** Max overall upload limit */
  'max-overall-upload-limit'?: string;
  /** Optimize concurrent downloads */
  'optimize-concurrent-downloads'?: boolean;
  /** Save session */
  'save-session'?: string;
  /** Save session interval */
  'save-session-interval'?: number;
}