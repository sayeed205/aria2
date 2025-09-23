/**
 * Notification event types and payload definitions for aria2 JSON-RPC
 * Ensures type-safe subscription to notification events.
 *
 * See: https://aria2.github.io/manual/en/html/aria2c.html#notifications
 */

/** Valid notification method names from aria2 */
export type Aria2NotificationType =
  | "onDownloadStart"
  | "onDownloadPause"
  | "onDownloadStop"
  | "onDownloadComplete"
  | "onDownloadError"
  | "onBtDownloadComplete";

/** The notification method names emitted by aria2 (JSON-RPC) */
export type Aria2NotificationMethod =
  | "aria2.onDownloadStart"
  | "aria2.onDownloadPause"
  | "aria2.onDownloadStop"
  | "aria2.onDownloadComplete"
  | "aria2.onDownloadError"
  | "aria2.onBtDownloadComplete";

/**
 * Core notification payload structure (event argument).
 * aria2 may extend this per notification, but currently all share these keys.
 */
export interface Aria2NotificationEventBase {
  gid: string;
  // Additional fields may be present depending on aria2 version/notification type.
}

/**
 * Mapping of notification type to payload shape.
 * If in future any notification has a more detailed payload, extend here.
 */
export interface Aria2NotificationPayloads {
  onDownloadStart: Aria2NotificationEventBase;
  onDownloadPause: Aria2NotificationEventBase;
  onDownloadStop: Aria2NotificationEventBase;
  onDownloadComplete: Aria2NotificationEventBase;
  onDownloadError: Aria2NotificationEventBase;
  onBtDownloadComplete: Aria2NotificationEventBase;
}

/**
 * Type signature for a notification event handler.
 * @template T - The notification type
 */
export type Aria2NotificationHandler<T extends Aria2NotificationType> = (
  event: Aria2NotificationPayloads[T],
) => void;
