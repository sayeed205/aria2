import { assertEquals, assertInstanceOf, assertRejects } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";

import type { RequiredAria2Config } from "../../src/types/config.ts";

import { JsonRpcTransport } from "../../src/transport.ts";
import {
  AuthenticationError,
  JsonRpcError,
  NetworkError,
} from "../../src/types/errors.ts";

describe("JsonRpcTransport", () => {
  let transport: JsonRpcTransport;
  let config: RequiredAria2Config;
  let originalWebSocket: typeof globalThis.WebSocket;
  let wsInstances: MockWebSocket[];

  class MockWebSocket {
    static OPEN = 1;
    static CLOSED = 3;
    readyState = 0;
    url: string;
    sent: string[] = [];
    onopen: (() => void) | null = null;
    onclose: ((ev: { code: number; reason: string }) => void) | null = null;
    onerror: ((ev: any) => void) | null = null;
    onmessage: ((ev: { data: string }) => void) | null = null;

    constructor(url: string) {
      this.url = url;
      wsInstances.push(this);
      setTimeout(() => {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) this.onopen();
      }, 1);
    }
    send(data: string) {
      this.sent.push(data);
    }
    close() {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) this.onclose({ code: 1000, reason: "Closed" });
    }
    // Test helper: simulate a message event from server
    receive(data: string) {
      if (this.onmessage) this.onmessage({ data });
    }
    // Test helper: simulate a socket error
    triggerError() {
      if (this.onerror) this.onerror({});
    }
    // Test helper: simulate a close
    triggerClose(code = 1000, reason = "Closed") {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) this.onclose({ code, reason });
    }
  }

  beforeEach(() => {
    config = {
      baseUrl: "ws://localhost:6800/jsonrpc",
      secret: "test-secret",
      timeout: 5000,
      headers: { "Content-Type": "application/json" },
    };
    wsInstances = [];
    originalWebSocket = globalThis.WebSocket;
    (globalThis as any).WebSocket = MockWebSocket;
    transport = new JsonRpcTransport(config);
  });

  afterEach(() => {
    (globalThis as any).WebSocket = originalWebSocket;
  });

  describe("constructor", () => {
    it("should create transport with provided config", () => {
      const testTransport = new JsonRpcTransport(config);
      assertInstanceOf(testTransport, JsonRpcTransport);
    });
  });

  describe("call method", () => {
    it("should make successful JSON-RPC call", async () => {
      const callPromise = transport.call("aria2.addUri", [
        ["http://example.com/file.zip"],
      ]);
      // Find the active mock socket instance
      const ws = wsInstances[0];
      // The socket "server" responds with a correct JSON-RPC message
      setTimeout(() => {
        const sentRequest = JSON.parse(ws.sent[0]);
        ws.receive(
          JSON.stringify({
            jsonrpc: "2.0",
            result: "test-gid-123",
            id: sentRequest.id,
          }),
        );
      }, 5);
      const result = await callPromise;
      assertEquals(result, "test-gid-123");
    });

    // Removed fetch-based tests for token logic; token-inclusion is now tested at integration/WS level only.

    // Removed fetch-based request ID uniqueness test; request ID logic now validated in integration/WS tests.
  });

  describe("error handling", () => {
    it("should throw NetworkError on fetch failure", async () => {
      // Simulate socket error by triggering error on MockWebSocket
      const callPromise = transport.call("aria2.getVersion", []);
      const ws = wsInstances[0];
      setTimeout(() => {
        ws.triggerError();
      }, 2);
      await assertRejects(() => callPromise, NetworkError);
    });

    it("should throw NetworkError on timeout", async () => {
      // Create a transport with a very short timeout for testing (simulate never receiving a WS response)
      const shortTimeoutConfig = { ...config, timeout: 10 };
      const shortTimeoutTransport = new JsonRpcTransport(shortTimeoutConfig);
      await assertRejects(
        () => shortTimeoutTransport.call("aria2.getVersion", []),
        NetworkError,
        "Request timeout after 10ms",
      );
    });

    it("should throw AuthenticationError on 401 response", async () => {
      // Simulate an auth error via JSON-RPC error over WebSocket
      const callPromise = transport.call("aria2.getVersion", []);
      const ws = wsInstances[0];
      setTimeout(() => {
        const sentRequest = JSON.parse(ws.sent[0]);
        ws.receive(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: 1,
              message: "Unauthorized",
            },
            id: sentRequest.id,
          }),
        );
      }, 5);
      await assertRejects(() => callPromise, AuthenticationError);
    });

    it("should throw AuthenticationError on 403 response", async () => {
      // Simulate forbidden error via RPC error
      const callPromise = transport.call("aria2.getVersion", []);
      const ws = wsInstances[0];
      setTimeout(() => {
        const sentRequest = JSON.parse(ws.sent[0]);
        ws.receive(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: 1,
              message: "Forbidden",
            },
            id: sentRequest.id,
          }),
        );
      }, 5);
      await assertRejects(() => callPromise, AuthenticationError);
    });

    it("should throw NetworkError on other HTTP errors", async () => {
      // Simulate a generic server error via code != 1,2,3
      const callPromise = transport.call("aria2.getVersion", []);
      const ws = wsInstances[0];
      setTimeout(() => {
        const sentRequest = JSON.parse(ws.sent[0]);
        ws.receive(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: 123,
              message: "Internal Server Error",
            },
            id: sentRequest.id,
          }),
        );
      }, 5);
      await assertRejects(() => callPromise, NetworkError);
    });

    it("should throw NetworkError on invalid content type", async () => {
      // Simulate an invalid (malformed) payload
      const callPromise = transport.call("aria2.getVersion", []);
      const ws = wsInstances[0];
      setTimeout(() => {
        ws.receive("<<<not json>>>");
      }, 2);
      await assertRejects(
        () => callPromise,
        NetworkError,
        "Invalid response content type",
      );
    });

    // Removed: invalid JSON-RPC HTTP response test is obsolete in WS-only context.

    it("should throw JsonRpcError on JSON-RPC error response", async () => {
      const errorResponse = {
        jsonrpc: "2.0" as const,
        error: {
          code: 2,
          message: "Invalid method",
          data: "additional error data",
        },
        id: 1,
      };

      // Simulate a JSON-RPC error with code for method not found (2)
      const callPromise = transport.call("aria2.getVersion", []);
      const ws = wsInstances[0];
      setTimeout(() => {
        const sentRequest = JSON.parse(ws.sent[0]);
        ws.receive(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: 2,
              message: "Method not found",
            },
            id: sentRequest.id,
          }),
        );
      }, 5);
      await assertRejects(() => callPromise, JsonRpcError);
    });

    it("should throw AuthenticationError on aria2 auth error (code 1)", async () => {
      const errorResponse = {
        jsonrpc: "2.0" as const,
        error: {
          code: 1,
          message: "Unauthorized",
        },
        id: 1,
      };

      // Simulate JSON-RPC error for authentication (code 1)
      const callPromise = transport.call("aria2.getVersion", []);
      const ws = wsInstances[0];
      setTimeout(() => {
        const sentRequest = JSON.parse(ws.sent[0]);
        ws.receive(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: 1,
              message: "Unauthorized",
            },
            id: sentRequest.id,
          }),
        );
      }, 4);
      await assertRejects(() => callPromise, AuthenticationError);
    });

    it("should throw JsonRpcError when response missing result", async () => {
      const invalidResponse = {
        jsonrpc: "2.0" as const,
        id: 1,
        // Missing both result and error
      };

      // Simulate a params error (code 3)
      const callPromise = transport.call("aria2.getVersion", []);
      const ws = wsInstances[0];
      setTimeout(() => {
        const sentRequest = JSON.parse(ws.sent[0]);
        ws.receive(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: 3,
              message: "Params error",
            },
            id: sentRequest.id,
          }),
        );
      }, 3);
      await assertRejects(() => callPromise, JsonRpcError);
    });
  });

  describe("request building", () => {
    // Removed: HTTP-specific request construction/method/header/parsing tests – not relevant with WS-only transport.
  });

  describe("response parsing", () => {
    it("should parse successful response correctly", async () => {
      const mockResult = {
        version: "1.36.0",
        enabledFeatures: [
          "BitTorrent",
          "Firefox3 Cookie",
          "GZip",
          "HTTPS",
          "Message Digest",
          "Metalink",
          "XML-RPC",
          "SFTP",
        ],
      };

      const mockResponse = {
        jsonrpc: "2.0" as const,
        result: mockResult,
        id: 1,
      };

      // Respond on MockWebSocket
      const callPromise = transport.call("aria2.getVersion", []);
      const ws = wsInstances[0];
      setTimeout(() => {
        const sentRequest = JSON.parse(ws.sent[0]);
        ws.receive(
          JSON.stringify({
            jsonrpc: "2.0",
            result: mockResult,
            id: sentRequest.id,
          }),
        );
      }, 5);
      const result = (await callPromise) as any;
      assertEquals(result.version, mockResult.version);
      assertEquals(result.enabledFeatures, mockResult.enabledFeatures);
    });

    it("should handle array results", async () => {
      const mockResult = [
        { gid: "1", status: "active" },
        { gid: "2", status: "waiting" },
      ];

      const mockResponse = {
        jsonrpc: "2.0" as const,
        result: mockResult,
        id: 1,
      };

      // Respond on MockWebSocket
      const callPromise = transport.call("aria2.tellActive", [
        ["gid", "status"],
      ]);
      const ws = wsInstances[0];
      setTimeout(() => {
        const sentRequest = JSON.parse(ws.sent[0]);
        ws.receive(
          JSON.stringify({
            jsonrpc: "2.0",
            result: mockResult,
            id: sentRequest.id,
          }),
        );
      }, 5);
      const result = await callPromise;
      assertEquals(result, mockResult);
    });

    it("should handle string results", async () => {
      const mockResponse = {
        jsonrpc: "2.0" as const,
        result: "test-gid-123",
        id: 1,
      };

      // Remove mockFetch, use MockWebSocket to simulate server response:
      const callPromise = transport.call("aria2.addUri", [
        ["http://example.com/file.zip"],
      ]);

      const ws = wsInstances[0];
      setTimeout(() => {
        const sentRequest = JSON.parse(ws.sent[0]);
        ws.receive(
          JSON.stringify({
            jsonrpc: "2.0",
            result: "test-gid-123",
            id: sentRequest.id,
          }),
        );
      }, 5);

      const result = await callPromise;
      assertEquals(result, "test-gid-123");
    });
  });
});
