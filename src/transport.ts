import { RequiredAria2Config } from './types/config.ts';
import { 
  JsonRpcRequest, 
  JsonRpcResponse, 
  JsonRpcErrorResponse,
  RequestId,
  Aria2MethodName,
  Aria2MethodSignatures,
  Aria2MethodParams,
  Aria2MethodResult
} from './types/jsonrpc.ts';
import { 
  Aria2Error,
  NetworkError, 
  JsonRpcError, 
  AuthenticationError 
} from './types/errors.ts';

/**
 * JSON-RPC transport layer for aria2 communication
 * Handles HTTP requests, response parsing, and error handling
 */
export class JsonRpcTransport {
  private requestIdCounter = 0;

  constructor(private readonly config: RequiredAria2Config) {}

  /**
   * Makes a type-safe JSON-RPC call to aria2
   * @param method - The aria2 method name
   * @param params - Method parameters
   * @returns Promise resolving to the method result
   */
  async call<T extends Aria2MethodName>(
    method: T,
    params: Aria2MethodParams<Aria2MethodSignatures[T]>
  ): Promise<Aria2MethodResult<Aria2MethodSignatures[T]>> {
    const request = this.buildRequest(method, params);
    
    try {
      const response = await this.sendRequest(request);
      return this.handleResponse<Aria2MethodResult<Aria2MethodSignatures[T]>>(response);
    } catch (error) {
      if (error instanceof Aria2Error) {
        throw error;
      }
      
      // Wrap unknown errors as network errors
      throw new NetworkError(
        `Failed to communicate with aria2: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
  }

  /**
   * Builds a JSON-RPC request object
   * @param method - The method name
   * @param params - Method parameters
   * @returns JSON-RPC request object
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
   * Sends HTTP request to aria2 server
   * @param request - JSON-RPC request object
   * @returns Promise resolving to JSON-RPC response
   */
  private async sendRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: this.config.headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new AuthenticationError(
            `Authentication failed: ${response.status} ${response.statusText}`
          );
        }
        
        throw new NetworkError(
          `HTTP error: ${response.status} ${response.statusText}`
        );
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new NetworkError(
          `Invalid response content type: ${contentType}. Expected application/json`
        );
      }

      const jsonResponse = await response.json();
      
      // Validate JSON-RPC response structure
      if (!this.isValidJsonRpcResponse(jsonResponse)) {
        throw new NetworkError('Invalid JSON-RPC response format');
      }

      return jsonResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError(`Request timeout after ${this.config.timeout}ms`);
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError(`Network connection failed: ${error.message}`);
      }
      
      throw error;
    }
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
      throw new JsonRpcError('Response missing result field', -1);
    }

    return response.result as T;
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
          `Authentication failed: ${error.message}`
        );
      case 2:
        return new JsonRpcError(
          `Invalid method: ${error.message}`,
          error.code,
          error.data
        );
      case 3:
        return new JsonRpcError(
          `Invalid parameters: ${error.message}`,
          error.code,
          error.data
        );
      default:
        return new JsonRpcError(
          error.message,
          error.code,
          error.data
        );
    }
  }

  /**
   * Validates JSON-RPC response structure
   * @param obj - Object to validate
   * @returns True if valid JSON-RPC response
   */
  private isValidJsonRpcResponse(obj: unknown): obj is JsonRpcResponse {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    const response = obj as Record<string, unknown>;
    
    return (
      response.jsonrpc === "2.0" &&
      (typeof response.id === 'string' || typeof response.id === 'number') &&
      (response.result !== undefined || response.error !== undefined)
    );
  }

  /**
   * Generates unique request ID
   * @returns Request ID
   */
  private generateRequestId(): RequestId {
    return ++this.requestIdCounter;
  }
}