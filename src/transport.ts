import { RequiredAria2Config } from "./types/config.ts";
import {
  Aria2MethodName,
  Aria2MethodParams,
  Aria2MethodResult,
  Aria2MethodSignatures,
  JsonRpcErrorResponse,
  JsonRpcRequest,
  JsonRpcResponse,
  RequestId,
} from "./types/jsonrpc.ts";
import {
  Aria2Error,
  AuthenticationError,
  JsonRpcError,
  NetworkError,
} from "./types/errors.ts";

/**
 * Outstanding request type for map
 */
type PendingRequest = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

/**
 * JSON-RPC transport layer for aria2 communication using native WebSocket only.
 * Handles WebSocket connection, request/response mapping, and error handling.
 *
 * This class is used internally by the Aria2 client and provides:
 * - Type-safe JSON-RPC method calls over a persistent WebSocket connection
 * - Automatic request/response serialization, mapping, timeout management
 * - Comprehensive error handling and mapping (matching previous fetch-based semantics)
 * - Authentication token management
 *
 * @internal This class is not intended for direct use by consumers
 * @note HTTP/fetch is no longer supported; only ws:// or wss:// endpoints are allowed.
 */
export class JsonRpcTransport {
  private requestIdCounter = 0;
  private ws: WebSocket | null = null;
  private pending: Map<RequestId, PendingRequest> = new Map();
  private isClosed: boolean = false;
  private wsReadyPromise: Promise<void> | null = null;

  constructor(private readonly config: RequiredAria2Config) {}

  /**
   * Makes a type-safe JSON-RPC call to aria2
   * @param method - The aria2 method name
   * @param params - Method parameters
   * @returns Promise resolving to the method result
   */
  async call<T extends Aria2MethodName>(
    method: T,
    params: Aria2MethodParams<Aria2MethodSignatures[T]>,
  ): Promise<Aria2MethodResult<Aria2MethodSignatures[T]>> {
    const request = this.buildRequest(method, params);

    try {
      const response = await this.sendRequest(request);
      return this.handleResponse<Aria2MethodResult<Aria2MethodSignatures[T]>>(
        response,
      );
    } catch (error) {
      if (error instanceof Aria2Error) {
        throw error;
      }
      throw new NetworkError(
        `Failed to communicate with aria2: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      );
    }
  }

  /**
   * Closes the underlying WebSocket connection and rejects all pending requests.
   * After calling close(), this transport instance cannot be used again.
   * Safe to call multiple times.
   */
  public close(): void {
    this.cleanupSocket(
      new NetworkError("WebSocket connection closed by user via close()"),
    );
  }

  /**
   * Handles JSON-RPC response and extracts result or throws error
   * @param response - JSON-RPC response object
   * @returns The result data
   */
  private handleResponse<T>(response: JsonRpcResponse): T {
    if (response.error) {
      throw this.createJsonRpcError(response.error);
    }

    if (response.result === undefined) {
      throw new JsonRpcError("Response missing result field", -1);
    }

    return response.result as T;
  }

  /**
   * Builds a JSON-RPC request object.
   * Automatically includes token if configured.
   */
  private buildRequest(method: string, params: unknown[]): JsonRpcRequest {
    const requestParams = this.config.secret
      ? [`token:${this.config.secret}`, ...params]
      : params;

    return {
      jsonrpc: "2.0",
      method,
      params: requestParams,
      id: this.generateRequestId(),
    };
  }

  /**
   * Generates unique request ID
   * @returns Request ID
   */
  private generateRequestId(): RequestId {
    return ++this.requestIdCounter;
  }

  /**
   * Sends a JSON-RPC request to aria2 server via native WebSocket.
   * Handles mapping of requests and responses, including timeout/rejection.
   */
  private async sendRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (this.isClosed) {
      throw new NetworkError("WebSocket is closed.");
    }
    await this.ensureWebSocket();

    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(request.id);
        reject(
          new NetworkError(`Request timeout after ${this.config.timeout}ms`),
        );
      }, this.config.timeout);

      this.pending.set(request.id, { resolve, reject, timeoutId });

      try {
        this.ws!.send(JSON.stringify(request));
      } catch (err) {
        clearTimeout(timeoutId);
        this.pending.delete(request.id);
        reject(
          new NetworkError(`WebSocket send failed:
            ${err instanceof Error ? err.message : String(err)}`),
        );
      }
    });
  }

  /**
   * Ensures there is an open WebSocket connection, opening if necessary.
   * Only ws:// and wss:// endpoints are allowed/supported.
   */
  private async ensureWebSocket(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }
    if (this.wsReadyPromise) {
      return this.wsReadyPromise;
    }

    this.wsReadyPromise = new Promise<void>((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.baseUrl);
        this.isClosed = false;
      } catch (err) {
        this.isClosed = true;
        this.ws = null;
        this.wsReadyPromise = null;
        reject(
          new NetworkError(
            `Failed to construct WebSocket: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
        return;
      }
      this.ws.onopen = () => {
        resolve();
      };
      this.ws.onerror = (event) => {
        // clean up and reject all pending
        this.cleanupSocket(new NetworkError("WebSocket error event"));
        reject(new NetworkError("WebSocket error event"));
      };
      this.ws.onclose = (event) => {
        this.isClosed = true;
        this.ws = null;
        this.cleanupSocket(
          new NetworkError(
            `WebSocket closed: code=${event.code}, reason=${event.reason}`,
          ),
        );
      };
      this.ws.onmessage = (event) => {
        this.handleWsMessage(event.data);
      };
    });
    try {
      await this.wsReadyPromise;
    } catch (err) {
      this.wsReadyPromise = null;
      throw err;
    }
    this.wsReadyPromise = null;
  }

  /**
   * Handles incoming WebSocket messages.
   * Maps received messages to the correct pending request based on id.
   */
  private handleWsMessage(data: any) {
    let obj: unknown;
    try {
      obj = typeof data === "string" ? JSON.parse(data) : data;
    } catch (e) {
      // Ignore/Log parse errors
      return;
    }
    if (!this.isValidJsonRpcResponse(obj)) {
      // Ignore or log invalid ws message
      return;
    }
    const response = obj as JsonRpcResponse;
    const pending = this.pending.get(response.id);
    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pending.delete(response.id);
      if (response.error) {
        pending.reject(this.createJsonRpcError(response.error));
      } else {
        pending.resolve(response);
      }
    }
    // else: response for unknown/expired/late id (no-op)
  }

  /**
   * Validates JSON-RPC response structure
   * @param obj - Object to validate
   * @returns True if valid JSON-RPC response
   */
  private isValidJsonRpcResponse(obj: unknown): obj is JsonRpcResponse {
    if (typeof obj !== "object" || obj === null) {
      return false;
    }
    const response = obj as Record<string, unknown>;
    return (
      response.jsonrpc === "2.0" &&
      (typeof response.id === "string" || typeof response.id === "number") &&
      (response.result !== undefined || response.error !== undefined)
    );
  }

  /**
   * Creates appropriate error from JSON-RPC error response
   * @param error - JSON-RPC error object
   * @returns Appropriate error instance
   */
  private createJsonRpcError(error: JsonRpcErrorResponse): Aria2Error {
    // Map common aria2 error codes to more specific errors
    switch (error.code) {
      case 1:
        return new AuthenticationError(
          `Authentication failed: ${error.message}`,
        );
      case 2:
        return new JsonRpcError(
          `Invalid method: ${error.message}`,
          error.code,
          error.data,
        );
      case 3:
        return new JsonRpcError(
          `Invalid parameters: ${error.message}`,
          error.code,
          error.data,
        );
      default:
        return new JsonRpcError(error.message, error.code, error.data);
    }
  }

  /**
   * On fatal error, close, or error event: reject all outstanding requests,
   * clear state, and close the underlying WebSocket connection.
   */
  private cleanupSocket(reason: Error) {
    for (const [, pending] of this.pending.entries()) {
      clearTimeout(pending.timeoutId);
      pending.reject(reason);
    }
    this.pending.clear();
    if (this.ws) {
      this.ws.close();
    }
    this.isClosed = true;
    this.ws = null;
  }
}
