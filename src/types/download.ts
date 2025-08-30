/**
 * Download status values from aria2
 */
export type DownloadStatusValue = 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed';

/**
 * URI information for a file
 */
export interface UriInfo {
  /** URI string */
  uri: string;
  /** Status of this URI */
  status: 'used' | 'waiting';
}

/**
 * File information within a download
 */
export interface FileInfo {
  /** File index within the download */
  index: string;
  /** File path */
  path: string;
  /** Total file length in bytes */
  length: string;
  /** Completed length in bytes */
  completedLength: string;
  /** Whether this file is selected for download */
  selected: string;
  /** List of URIs for this file */
  uris: UriInfo[];
}

/**
 * BitTorrent-specific information
 */
export interface BitTorrentInfo {
  /** Announce list */
  announceList?: string[][];
  /** Comment */
  comment?: string;
  /** Creation date */
  creationDate?: string;
  /** Mode (single or multi) */
  mode?: string;
  /** Info hash */
  info?: {
    /** Torrent name */
    name: string;
  };
}

/**
 * Complete download status information from aria2
 */
export interface DownloadStatus {
  /** Download GID */
  gid: string;
  /** Current status */
  status: DownloadStatusValue;
  /** Total length in bytes */
  totalLength: string;
  /** Completed length in bytes */
  completedLength: string;
  /** Upload length in bytes */
  uploadLength: string;
  /** Bitfield of completed pieces */
  bitfield?: string;
  /** Download speed in bytes/sec */
  downloadSpeed: string;
  /** Upload speed in bytes/sec */
  uploadSpeed: string;
  /** Info hash for BitTorrent downloads */
  infoHash?: string;
  /** Number of seeders */
  numSeeders?: string;
  /** Whether this download is a seeder */
  seeder?: string;
  /** Piece length in bytes */
  pieceLength?: string;
  /** Number of pieces */
  numPieces?: string;
  /** Number of connections */
  connections: string;
  /** Error code if status is 'error' */
  errorCode?: string;
  /** Error message if status is 'error' */
  errorMessage?: string;
  /** GIDs of downloads that will start after this one */
  followedBy?: string[];
  /** GID of download this one is following */
  following?: string;
  /** GID of parent download (for metalink) */
  belongsTo?: string;
  /** Download directory */
  dir: string;
  /** List of files in this download */
  files: FileInfo[];
  /** BitTorrent-specific information */
  bittorrent?: BitTorrentInfo;
}