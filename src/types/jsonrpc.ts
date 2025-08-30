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

/**
 * Utility type for aria2 method signatures
 */
export interface Aria2Method<
  TParams extends unknown[] = unknown[],
  TResult = unknown,
> {
  /** Method name */
  method: string;
  /** Parameter types */
  params: TParams;
  /** Return type */
  result: TResult;
}

/**
 * Type-safe aria2 method parameter validation
 */
export type Aria2MethodParams<T> = T extends Aria2Method<infer P, unknown> ? P
  : never;

/**
 * Type-safe aria2 method result extraction
 */
export type Aria2MethodResult<T> = T extends Aria2Method<unknown[], infer R> ? R
  : never;

/**
 * Common aria2 method parameter types
 */
export interface Aria2MethodSignatures {
  // Download management methods
  "aria2.addUri": Aria2Method<[string[], Record<string, unknown>?], string>;
  "aria2.addTorrent": Aria2Method<
    [string, string[]?, Record<string, unknown>?],
    string
  >;
  "aria2.addMetalink": Aria2Method<
    [string, Record<string, unknown>?],
    string[]
  >;

  // Download control methods
  "aria2.pause": Aria2Method<[string], string>;
  "aria2.unpause": Aria2Method<[string], string>;
  "aria2.remove": Aria2Method<[string], string>;
  "aria2.forceRemove": Aria2Method<[string], string>;

  // Status query methods
  "aria2.tellStatus": Aria2Method<[string, string[]?], Record<string, unknown>>;
  "aria2.tellActive": Aria2Method<[string[]?], Record<string, unknown>[]>;
  "aria2.tellWaiting": Aria2Method<
    [number, number, string[]?],
    Record<string, unknown>[]
  >;
  "aria2.tellStopped": Aria2Method<
    [number, number, string[]?],
    Record<string, unknown>[]
  >;

  // Global methods
  "aria2.getGlobalOption": Aria2Method<[], Record<string, string>>;
  "aria2.changeGlobalOption": Aria2Method<[Record<string, string>], string>;
  "aria2.getGlobalStat": Aria2Method<[], Record<string, string>>;

  // System methods
  "aria2.getVersion": Aria2Method<[], Record<string, string>>;
  "aria2.shutdown": Aria2Method<[], string>;
}

/**
 * Extract method names from aria2 method signatures
 */
export type Aria2MethodName = keyof Aria2MethodSignatures;

/**
 * Type-safe method call helper
 */
export type TypedJsonRpcRequest<T extends Aria2MethodName> = {
  jsonrpc: "2.0";
  method: T;
  params: Aria2MethodParams<Aria2MethodSignatures[T]>;
  id: RequestId;
};

/**
 * Type-safe response helper
 */
export type TypedJsonRpcResponse<T extends Aria2MethodName> = JsonRpcResponse<
  Aria2MethodResult<Aria2MethodSignatures[T]>
>;
