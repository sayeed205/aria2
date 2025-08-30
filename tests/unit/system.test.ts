import { expect } from "@std/expect";
import { beforeEach, describe, it } from "@std/testing/bdd";

import type { JsonRpcTransport } from "../../src/transport.ts";
import type { VersionInfo } from "../../src/types/global.ts";

import { SystemMethods } from "../../src/methods/system.ts";
import { ValidationError } from "../../src/types/errors.ts";

// Mock transport for testing
class MockTransport {
  public lastMethod: string = "";
  public lastParams: unknown[] = [];
  public mockResult: unknown = "";

  async call(method: string, params: unknown[]): Promise<unknown> {
    this.lastMethod = method;
    this.lastParams = params;
    return this.mockResult;
  }
}

describe("SystemMethods", () => {
  let systemMethods: SystemMethods;
  let mockTransport: MockTransport;

  beforeEach(() => {
    mockTransport = new MockTransport();
    systemMethods = new SystemMethods(
      mockTransport as unknown as JsonRpcTransport,
    );
  });

  describe("getVersion", () => {
    it("should call transport with correct method and no parameters", async () => {
      const mockVersion: VersionInfo = {
        version: "1.36.0",
        enabledFeatures: [
          "Async DNS",
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
      mockTransport.mockResult = mockVersion;

      const result = await systemMethods.getVersion();

      expect(result).toEqual(mockVersion);
      expect(mockTransport.lastMethod).toBe("aria2.getVersion");
      expect(mockTransport.lastParams).toEqual([]);
    });

    it("should handle version info with empty features", async () => {
      const mockVersion: VersionInfo = {
        version: "1.35.0",
        enabledFeatures: [],
      };
      mockTransport.mockResult = mockVersion;

      const result = await systemMethods.getVersion();

      expect(result).toEqual(mockVersion);
      expect(result.enabledFeatures).toEqual([]);
    });
  });

  describe("shutdown", () => {
    it("should call transport with correct method and no parameters", async () => {
      mockTransport.mockResult = "OK";

      const result = await systemMethods.shutdown();

      expect(result).toBe("OK");
      expect(mockTransport.lastMethod).toBe("aria2.shutdown");
      expect(mockTransport.lastParams).toEqual([]);
    });
  });

  describe("forceShutdown", () => {
    it("should call transport with correct method and no parameters", async () => {
      mockTransport.mockResult = "OK";

      const result = await systemMethods.forceShutdown();

      expect(result).toBe("OK");
      expect(mockTransport.lastMethod).toBe("aria2.forceShutdown");
      expect(mockTransport.lastParams).toEqual([]);
    });
  });

  describe("saveSession", () => {
    it("should call transport with correct method and no parameters", async () => {
      mockTransport.mockResult = "OK";

      const result = await systemMethods.saveSession();

      expect(result).toBe("OK");
      expect(mockTransport.lastMethod).toBe("aria2.saveSession");
      expect(mockTransport.lastParams).toEqual([]);
    });
  });

  describe("purgeDownloadResult", () => {
    it("should call transport with correct method and no parameters", async () => {
      mockTransport.mockResult = "OK";

      const result = await systemMethods.purgeDownloadResult();

      expect(result).toBe("OK");
      expect(mockTransport.lastMethod).toBe("aria2.purgeDownloadResult");
      expect(mockTransport.lastParams).toEqual([]);
    });
  });

  describe("removeDownloadResult", () => {
    it("should call transport with correct GID", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = "OK";

      const result = await systemMethods.removeDownloadResult(testGid);

      expect(result).toBe("OK");
      expect(mockTransport.lastMethod).toBe("aria2.removeDownloadResult");
      expect(mockTransport.lastParams).toEqual([testGid]);
    });

    it("should throw ValidationError for invalid GID format", async () => {
      await expect(systemMethods.removeDownloadResult("invalid-gid")).rejects
        .toThrow(ValidationError);
      await expect(systemMethods.removeDownloadResult("invalid-gid")).rejects
        .toThrow("Invalid GID format");
    });

    it("should throw ValidationError for empty GID", async () => {
      await expect(systemMethods.removeDownloadResult("")).rejects.toThrow(
        ValidationError,
      );
      await expect(systemMethods.removeDownloadResult("   ")).rejects.toThrow(
        ValidationError,
      );
    });

    it("should throw ValidationError for non-string GID", async () => {
      // @ts-expect-error Testing invalid input
      await expect(systemMethods.removeDownloadResult(123)).rejects.toThrow(
        ValidationError,
      );
    });

    it("should accept valid 16-character hex GID", async () => {
      const validGids = [
        "1234567890abcdef",
        "ABCDEF1234567890",
        "0000000000000000",
        "ffffffffffffffff",
      ];

      for (const gid of validGids) {
        mockTransport.mockResult = "OK";
        await systemMethods.removeDownloadResult(gid);
        expect(mockTransport.lastMethod).toBe("aria2.removeDownloadResult");
        expect(mockTransport.lastParams).toEqual([gid]);
      }
    });

    it("should reject GIDs that are too short", async () => {
      await expect(systemMethods.removeDownloadResult("123456789abcdef"))
        .rejects.toThrow(ValidationError);
    });

    it("should reject GIDs that are too long", async () => {
      await expect(systemMethods.removeDownloadResult("1234567890abcdef0"))
        .rejects.toThrow(ValidationError);
    });

    it("should reject GIDs with invalid characters", async () => {
      await expect(systemMethods.removeDownloadResult("123456789abcdefg"))
        .rejects.toThrow(ValidationError);
      await expect(systemMethods.removeDownloadResult("123456789abcde-f"))
        .rejects.toThrow(ValidationError);
    });
  });

  describe("error handling", () => {
    it("should propagate transport errors", async () => {
      const error = new Error("Network error");
      mockTransport.call = async () => {
        throw error;
      };

      await expect(systemMethods.getVersion()).rejects.toThrow("Network error");
      await expect(systemMethods.shutdown()).rejects.toThrow("Network error");
      await expect(systemMethods.forceShutdown()).rejects.toThrow(
        "Network error",
      );
      await expect(systemMethods.saveSession()).rejects.toThrow(
        "Network error",
      );
      await expect(systemMethods.purgeDownloadResult()).rejects.toThrow(
        "Network error",
      );
    });

    it("should handle transport errors for removeDownloadResult", async () => {
      const error = new Error("Network error");
      mockTransport.call = async () => {
        throw error;
      };

      await expect(systemMethods.removeDownloadResult("1234567890abcdef"))
        .rejects.toThrow("Network error");
    });
  });

  describe("method parameter validation", () => {
    it("should not require parameters for parameterless methods", async () => {
      mockTransport.mockResult = "OK";

      // These methods should work without any parameters
      await systemMethods.shutdown();
      await systemMethods.forceShutdown();
      await systemMethods.saveSession();
      await systemMethods.purgeDownloadResult();

      // Verify they were called with empty parameter arrays
      expect(mockTransport.lastParams).toEqual([]);
    });

    it("should require valid GID for removeDownloadResult", async () => {
      // Test that the method validates its required parameter
      await expect(systemMethods.removeDownloadResult("")).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("response handling", () => {
    it("should handle different response types correctly", async () => {
      // Test version info response
      const versionInfo: VersionInfo = {
        version: "1.36.0",
        enabledFeatures: ["BitTorrent", "HTTPS"],
      };
      mockTransport.mockResult = versionInfo;
      const version = await systemMethods.getVersion();
      expect(version).toEqual(versionInfo);

      // Test string responses
      mockTransport.mockResult = "OK";
      const shutdownResult = await systemMethods.shutdown();
      expect(shutdownResult).toBe("OK");
    });

    it("should handle version info with various feature sets", async () => {
      const testCases = [
        {
          version: "1.35.0",
          enabledFeatures: ["BitTorrent"],
        },
        {
          version: "1.36.0",
          enabledFeatures: ["BitTorrent", "HTTPS", "XML-RPC", "Metalink"],
        },
        {
          version: "1.37.0",
          enabledFeatures: [],
        },
      ];

      for (const testCase of testCases) {
        mockTransport.mockResult = testCase;
        const result = await systemMethods.getVersion();
        expect(result).toEqual(testCase);
      }
    });
  });
});
