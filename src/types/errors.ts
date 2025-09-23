/**
 * Base class for all aria2-related errors
 *
 * @example Error handling
 * ```typescript
 * try {
 *   await aria2.addUri(["https://example.com/file.zip"]);
 * } catch (error) {
 *   if (error instanceof Aria2Error) {
 *     console.log(`aria2 error (${error.code}): ${error.message}`);
 *   }
 * }
 * ```
 */
export abstract class Aria2Error extends Error {
  /** Error code identifier */
  abstract readonly code: string;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

/**
 * Network-related errors (connection failures, timeouts, etc.)
 */
export class NetworkError extends Aria2Error {
  readonly code = "NETWORK_ERROR";
}

/**
 * Authentication errors (invalid secret, unauthorized access)
 */
export class AuthenticationError extends Aria2Error {
  readonly code = "AUTH_ERROR";
}

/**
 * JSON-RPC protocol errors from aria2
 *
 * @example Handling specific aria2 errors
 * ```typescript
 * try {
 *   await aria2.pause(gid);
 * } catch (error) {
 *   if (error instanceof JsonRpcError) {
 *     switch (error.rpcCode) {
 *       case 1:
 *         console.log("Authentication failed");
 *         break;
 *       case 4:
 *         console.log("Download not found");
 *         break;
 *       case 5:
 *         console.log("Cannot pause download in current state");
 *         break;
 *     }
 *   }
 * }
 * ```
 */
export class JsonRpcError extends Aria2Error {
  readonly code = "JSONRPC_ERROR";

  constructor(
    message: string,
    /** JSON-RPC error code from aria2 */
    public readonly rpcCode: number,
    /** Additional error data from aria2 */
    public readonly rpcData?: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/**
 * Parameter validation errors
 */
export class ValidationError extends Aria2Error {
  readonly code = "VALIDATION_ERROR";
}

/**
 * Configuration errors
 */
export class ConfigurationError extends Aria2Error {
  readonly code = "CONFIG_ERROR";
}
