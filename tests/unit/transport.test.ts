import { assertEquals, assertInstanceOf, assertRejects } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";

import { JsonRpcTransport } from "../../src/transport.ts";
import type { RequiredAria2Config } from "../../src/types/config.ts";
import {
  AuthenticationError,
  JsonRpcError,
  NetworkError,
} from "../../src/types/errors.ts";

describe("JsonRpcTransport", () => {
  let transport: JsonRpcTransport;
  let config: RequiredAria2Config;
  let originalFetch: typeof globalThis.fetch;
  let fetchCalls: Array<{ url: string; options: RequestInit }> = [];

  beforeEach(() => {
    config = {
      baseUrl: "http://localhost:6800/jsonrpc",
      secret: "test-secret",
      timeout: 5000,
      headers: { "Content-Type": "application/json" },
    };
    transport = new JsonRpcTransport(config);

    // Store original fetch and reset call tracking
    originalFetch = globalThis.fetch;
    fetchCalls = [];
  });

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch;
  });

  function mockFetch(response: Response | Promise<Response> | Error): void {
    globalThis.fetch = (url: string | URL | Request, options?: RequestInit) => {
      fetchCalls.push({
        url: url.toString(),
        options: options || {},
      });

      if (response instanceof Error) {
        return Promise.reject(response);
      }

      return Promise.resolve(response);
    };
  }

  describe("constructor", () => {
    it("should create transport with provided config", () => {
      const testTransport = new JsonRpcTransport(config);
      assertInstanceOf(testTransport, JsonRpcTransport);
    });
  });

  describe("call method", () => {
    it("should make successful JSON-RPC call", async () => {
      const mockResponse = {
        jsonrpc: "2.0" as const,
        result: "test-gid-123",
        id: 1,
      };

      mockFetch(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      const result = await transport.call("aria2.addUri", [[
        "http://example.com/file.zip",
      ]]);
      assertEquals(result, "test-gid-123");
    });

    it("should include secret token in request params", async () => {
      const mockResponse = {
        jsonrpc: "2.0" as const,
        result: "test-gid-123",
        id: 1,
      };

      mockFetch(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      await transport.call("aria2.addUri", [["http://example.com/file.zip"]]);

      assertEquals(fetchCalls.length, 1);
      assertEquals(fetchCalls[0].url, config.baseUrl);

      const requestBody = JSON.parse(fetchCalls[0].options.body as string);
      assertEquals(requestBody.params[0], "token:test-secret");
      assertEquals(requestBody.params[1], ["http://example.com/file.zip"]);
    });

    it("should not include secret token when not configured", async () => {
      const configWithoutSecret = { ...config, secret: undefined };
      const transportWithoutSecret = new JsonRpcTransport(configWithoutSecret);

      const mockResponse = {
        jsonrpc: "2.0" as const,
        result: "test-gid-123",
        id: 1,
      };

      mockFetch(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      await transportWithoutSecret.call("aria2.addUri", [[
        "http://example.com/file.zip",
      ]]);

      const requestBody = JSON.parse(fetchCalls[0].options.body as string);
      assertEquals(requestBody.params[0], ["http://example.com/file.zip"]);
    });

    it("should generate unique request IDs", async () => {
      const mockResponse = {
        jsonrpc: "2.0" as const,
        result: "test-result",
        id: 1,
      };

      let callCount = 0;
      globalThis.fetch = (
        url: string | URL | Request,
        options?: RequestInit,
      ) => {
        fetchCalls.push({
          url: url.toString(),
          options: options || {},
        });

        // Create a fresh Response for each call
        return Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      };

      await transport.call("aria2.getVersion", []);
      await transport.call("aria2.getVersion", []);

      const firstRequestBody = JSON.parse(fetchCalls[0].options.body as string);
      const secondRequestBody = JSON.parse(
        fetchCalls[1].options.body as string,
      );

      assertEquals(firstRequestBody.id, 1);
      assertEquals(secondRequestBody.id, 2);
    });
  });

  describe("error handling", () => {
    it("should throw NetworkError on fetch failure", async () => {
      mockFetch(new TypeError("Failed to fetch"));

      await assertRejects(
        () => transport.call("aria2.getVersion", []),
        NetworkError,
        "Network connection failed",
      );
    });

    it("should throw NetworkError on timeout", async () => {
      // Create a transport with a very short timeout for testing
      const shortTimeoutConfig = { ...config, timeout: 10 };
      const shortTimeoutTransport = new JsonRpcTransport(shortTimeoutConfig);

      // Mock a fetch that takes longer than the timeout
      globalThis.fetch = () => new Promise(() => {}); // Never resolves

      await assertRejects(
        () => shortTimeoutTransport.call("aria2.getVersion", []),
        NetworkError,
        "Request timeout after 10ms",
      );
    });

    it("should throw AuthenticationError on 401 response", async () => {
      mockFetch(new Response("Unauthorized", { status: 401 }));

      await assertRejects(
        () => transport.call("aria2.getVersion", []),
        AuthenticationError,
        "Authentication failed: 401 Unauthorized",
      );
    });

    it("should throw AuthenticationError on 403 response", async () => {
      mockFetch(new Response("Forbidden", { status: 403 }));

      await assertRejects(
        () => transport.call("aria2.getVersion", []),
        AuthenticationError,
        "Authentication failed: 403 Forbidden",
      );
    });

    it("should throw NetworkError on other HTTP errors", async () => {
      mockFetch(new Response("Server Error", { status: 500 }));

      await assertRejects(
        () => transport.call("aria2.getVersion", []),
        NetworkError,
        "HTTP error: 500 Internal Server Error",
      );
    });

    it("should throw NetworkError on invalid content type", async () => {
      mockFetch(
        new Response("Not JSON", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
      );

      await assertRejects(
        () => transport.call("aria2.getVersion", []),
        NetworkError,
        "Invalid response content type",
      );
    });

    it("should throw NetworkError on invalid JSON-RPC response", async () => {
      mockFetch(
        new Response(JSON.stringify({ invalid: "response" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      await assertRejects(
        () => transport.call("aria2.getVersion", []),
        NetworkError,
        "Invalid JSON-RPC response format",
      );
    });

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

      mockFetch(
        new Response(JSON.stringify(errorResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      await assertRejects(
        () => transport.call("aria2.getVersion", []),
        JsonRpcError,
        "Invalid method",
      );
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

      mockFetch(
        new Response(JSON.stringify(errorResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      await assertRejects(
        () => transport.call("aria2.getVersion", []),
        AuthenticationError,
        "Authentication failed: Unauthorized",
      );
    });

    it("should throw JsonRpcError when response missing result", async () => {
      const invalidResponse = {
        jsonrpc: "2.0" as const,
        id: 1,
        // Missing both result and error
      };

      mockFetch(
        new Response(JSON.stringify(invalidResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      await assertRejects(
        () => transport.call("aria2.getVersion", []),
        JsonRpcError,
        "Response missing result field",
      );
    });
  });

  describe("request building", () => {
    it("should build correct JSON-RPC request structure", async () => {
      const mockResponse = {
        jsonrpc: "2.0" as const,
        result: [],
        id: 1,
      };

      mockFetch(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      await transport.call("aria2.tellActive", [["gid", "status"]]);

      const requestBody = JSON.parse(fetchCalls[0].options.body as string);

      assertEquals(requestBody.jsonrpc, "2.0");
      assertEquals(requestBody.method, "aria2.tellActive");
      assertEquals(requestBody.params, ["token:test-secret", [
        "gid",
        "status",
      ]]);
      assertEquals(typeof requestBody.id, "number");
    });

    it("should use correct HTTP method and headers", async () => {
      const mockResponse = {
        jsonrpc: "2.0" as const,
        result: {},
        id: 1,
      };

      mockFetch(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      await transport.call("aria2.getVersion", []);

      assertEquals(fetchCalls[0].url, config.baseUrl);
      assertEquals(fetchCalls[0].options.method, "POST");
      assertEquals(fetchCalls[0].options.headers, config.headers);
    });
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

      mockFetch(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      const result = await transport.call("aria2.getVersion", []) as any;
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

      mockFetch(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      const result = await transport.call("aria2.tellActive", []);
      assertEquals(result, mockResult);
    });

    it("should handle string results", async () => {
      const mockResponse = {
        jsonrpc: "2.0" as const,
        result: "test-gid-123",
        id: 1,
      };

      mockFetch(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      const result = await transport.call("aria2.addUri", [[
        "http://example.com/file.zip",
      ]]);
      assertEquals(result, "test-gid-123");
    });
  });
});
