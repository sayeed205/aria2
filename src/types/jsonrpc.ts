/**
 * JSON-RPC 2.0 request structure
 */
export interface JsonRpcRequest {
  /** JSON-RPC version, always "2.0" */
  jsonrpc: "2.0";
  
  /** Method name to call */
  method: string;
  
  /** Method parameters array */
  params: unknown[];
  
  /** Request identifier */
  id: string | number;
}

/**
 * JSON-RPC 2.0 response structure
 */
export interface JsonRpcResponse<T = unknown> {
  /** JSON-RPC version, always "2.0" */
  jsonrpc: "2.0";
  
  /** Result data (present on success) */
  result?: T;
  
  /** Error information (present on failure) */
  error?: JsonRpcErrorResponse;
  
  /** Request identifier */
  id: string | number;
}

/**
 * JSON-RPC 2.0 error structure
 */
export interface JsonRpcErrorResponse {
  /** Error code */
  code: number;
  
  /** Error message */
  message: string;
  
  /** Additional error data */
  data?: unknown;
}

/**
 * Type for generating unique request IDs
 */
export type RequestId = string | number;