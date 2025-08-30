import { expect } from "@std/expect";
import { beforeEach, describe, it } from "@std/testing/bdd";

import type { JsonRpcTransport } from "../../src/transport.ts";
import type { DownloadOptions } from "../../src/types/options.ts";

import { DownloadMethods } from "../../src/methods/download.ts";
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

describe("DownloadMethods", () => {
  let downloadMethods: DownloadMethods;
  let mockTransport: MockTransport;

  beforeEach(() => {
    mockTransport = new MockTransport();
    downloadMethods = new DownloadMethods(
      mockTransport as unknown as JsonRpcTransport,
    );
  });

  describe("addUri", () => {
    it("should call transport with correct parameters for single URI", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      const uris = ["https://example.com/file.zip"];
      const result = await downloadMethods.addUri(uris);

      expect(result).toBe(testGid);
      expect(mockTransport.lastMethod).toBe("aria2.addUri");
      expect(mockTransport.lastParams).toEqual([uris]);
    });

    it("should call transport with correct parameters for multiple URIs", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      const uris = [
        "https://example.com/file.zip",
        "https://mirror.com/file.zip",
      ];
      const result = await downloadMethods.addUri(uris);

      expect(result).toBe(testGid);
      expect(mockTransport.lastMethod).toBe("aria2.addUri");
      expect(mockTransport.lastParams).toEqual([uris]);
    });

    it("should call transport with options when provided", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      const uris = ["https://example.com/file.zip"];
      const options: DownloadOptions = {
        dir: "/downloads",
        out: "myfile.zip",
      };

      const result = await downloadMethods.addUri(uris, options);

      expect(result).toBe(testGid);
      expect(mockTransport.lastMethod).toBe("aria2.addUri");
      expect(mockTransport.lastParams).toEqual([uris, options]);
    });

    it("should throw ValidationError for empty URI array", async () => {
      await expect(downloadMethods.addUri([])).rejects.toThrow(ValidationError);
      await expect(downloadMethods.addUri([])).rejects.toThrow(
        "URIs must be a non-empty array",
      );
    });

    it("should throw ValidationError for non-array URIs", async () => {
      // @ts-expect-error Testing invalid input
      await expect(downloadMethods.addUri("not-an-array")).rejects.toThrow(
        ValidationError,
      );
    });

    it("should throw ValidationError for empty string URI", async () => {
      await expect(downloadMethods.addUri([""])).rejects.toThrow(
        ValidationError,
      );
      await expect(downloadMethods.addUri(["   "])).rejects.toThrow(
        ValidationError,
      );
    });

    it("should throw ValidationError for invalid URI format", async () => {
      await expect(downloadMethods.addUri(["not-a-valid-uri"])).rejects.toThrow(
        ValidationError,
      );
      await expect(downloadMethods.addUri(["not-a-valid-uri"])).rejects.toThrow(
        "Invalid URI format",
      );
    });

    it("should accept various valid URI schemes", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      const validUris = [
        "https://example.com/file.zip",
        "http://example.com/file.zip",
        "ftp://example.com/file.zip",
        "magnet:?xt=urn:btih:1234567890abcdef",
      ];

      for (const uri of validUris) {
        await downloadMethods.addUri([uri]);
        expect(mockTransport.lastMethod).toBe("aria2.addUri");
        expect(mockTransport.lastParams).toEqual([[uri]]);
      }
    });
  });

  describe("addTorrent", () => {
    const validBase64 = btoa("fake torrent data");
    const validUint8Array = new Uint8Array([1, 2, 3, 4, 5]);

    it("should call transport with base64 torrent data", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      const result = await downloadMethods.addTorrent(validBase64);

      expect(result).toBe(testGid);
      expect(mockTransport.lastMethod).toBe("aria2.addTorrent");
      expect(mockTransport.lastParams).toEqual([validBase64]);
    });

    it("should call transport with Uint8Array torrent data", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      const result = await downloadMethods.addTorrent(validUint8Array);

      expect(result).toBe(testGid);
      expect(mockTransport.lastMethod).toBe("aria2.addTorrent");
      // Should convert Uint8Array to base64
      const expectedBase64 = btoa(String.fromCharCode(...validUint8Array));
      expect(mockTransport.lastParams).toEqual([expectedBase64]);
    });

    it("should call transport with URIs when provided", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      const uris = ["https://example.com/webseed"];
      const result = await downloadMethods.addTorrent(validBase64, uris);

      expect(result).toBe(testGid);
      expect(mockTransport.lastMethod).toBe("aria2.addTorrent");
      expect(mockTransport.lastParams).toEqual([validBase64, uris]);
    });

    it("should call transport with options when provided", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      const options: DownloadOptions = { dir: "/downloads" };
      const result = await downloadMethods.addTorrent(
        validBase64,
        undefined,
        options,
      );

      expect(result).toBe(testGid);
      expect(mockTransport.lastMethod).toBe("aria2.addTorrent");
      expect(mockTransport.lastParams).toEqual([
        validBase64,
        undefined,
        options,
      ]);
    });

    it("should call transport with URIs and options when both provided", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      const uris = ["https://example.com/webseed"];
      const options: DownloadOptions = { dir: "/downloads" };
      const result = await downloadMethods.addTorrent(
        validBase64,
        uris,
        options,
      );

      expect(result).toBe(testGid);
      expect(mockTransport.lastMethod).toBe("aria2.addTorrent");
      expect(mockTransport.lastParams).toEqual([validBase64, uris, options]);
    });

    it("should throw ValidationError for invalid base64 string", async () => {
      await expect(downloadMethods.addTorrent("invalid-base64!")).rejects
        .toThrow(ValidationError);
      await expect(downloadMethods.addTorrent("invalid-base64!")).rejects
        .toThrow("Invalid base64 torrent data");
    });

    it("should throw ValidationError for invalid torrent data type", async () => {
      // @ts-expect-error Testing invalid input
      await expect(downloadMethods.addTorrent(123)).rejects.toThrow(
        ValidationError,
      );
      // @ts-expect-error Testing invalid input
      await expect(downloadMethods.addTorrent(123)).rejects.toThrow(
        "Torrent data must be a base64 string or Uint8Array",
      );
    });

    it("should validate URIs when provided", async () => {
      await expect(downloadMethods.addTorrent(validBase64, ["invalid-uri"]))
        .rejects.toThrow(ValidationError);
      await expect(downloadMethods.addTorrent(validBase64, ["invalid-uri"]))
        .rejects.toThrow("Invalid URI format");
    });
  });

  describe("addMetalink", () => {
    const validBase64 = btoa("fake metalink data");
    const validUint8Array = new Uint8Array([1, 2, 3, 4, 5]);

    it("should call transport with base64 metalink data", async () => {
      const testGids = ["1234567890abcdef", "fedcba0987654321"];
      mockTransport.mockResult = testGids;

      const result = await downloadMethods.addMetalink(validBase64);

      expect(result).toEqual(testGids);
      expect(mockTransport.lastMethod).toBe("aria2.addMetalink");
      expect(mockTransport.lastParams).toEqual([validBase64]);
    });

    it("should call transport with Uint8Array metalink data", async () => {
      const testGids = ["1234567890abcdef"];
      mockTransport.mockResult = testGids;

      const result = await downloadMethods.addMetalink(validUint8Array);

      expect(result).toEqual(testGids);
      expect(mockTransport.lastMethod).toBe("aria2.addMetalink");
      const expectedBase64 = btoa(String.fromCharCode(...validUint8Array));
      expect(mockTransport.lastParams).toEqual([expectedBase64]);
    });

    it("should call transport with options when provided", async () => {
      const testGids = ["1234567890abcdef"];
      mockTransport.mockResult = testGids;

      const options: DownloadOptions = { dir: "/downloads" };
      const result = await downloadMethods.addMetalink(validBase64, options);

      expect(result).toEqual(testGids);
      expect(mockTransport.lastMethod).toBe("aria2.addMetalink");
      expect(mockTransport.lastParams).toEqual([validBase64, options]);
    });

    it("should throw ValidationError for invalid base64 string", async () => {
      await expect(downloadMethods.addMetalink("invalid-base64!")).rejects
        .toThrow(ValidationError);
      await expect(downloadMethods.addMetalink("invalid-base64!")).rejects
        .toThrow("Invalid base64 metalink data");
    });

    it("should throw ValidationError for invalid metalink data type", async () => {
      // @ts-expect-error Testing invalid input
      await expect(downloadMethods.addMetalink(123)).rejects.toThrow(
        ValidationError,
      );
      // @ts-expect-error Testing invalid input
      await expect(downloadMethods.addMetalink(123)).rejects.toThrow(
        "Metalink data must be a base64 string or Uint8Array",
      );
    });
  });

  describe("pause", () => {
    it("should call transport with correct GID", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      const result = await downloadMethods.pause(testGid);

      expect(result).toBe(testGid);
      expect(mockTransport.lastMethod).toBe("aria2.pause");
      expect(mockTransport.lastParams).toEqual([testGid]);
    });

    it("should throw ValidationError for invalid GID format", async () => {
      await expect(downloadMethods.pause("invalid-gid")).rejects.toThrow(
        ValidationError,
      );
      await expect(downloadMethods.pause("invalid-gid")).rejects.toThrow(
        "Invalid GID format",
      );
    });

    it("should throw ValidationError for empty GID", async () => {
      await expect(downloadMethods.pause("")).rejects.toThrow(ValidationError);
      await expect(downloadMethods.pause("   ")).rejects.toThrow(
        ValidationError,
      );
    });

    it("should throw ValidationError for non-string GID", async () => {
      // @ts-expect-error Testing invalid input
      await expect(downloadMethods.pause(123)).rejects.toThrow(ValidationError);
    });

    it("should accept valid 16-character hex GID", async () => {
      const validGids = [
        "1234567890abcdef",
        "ABCDEF1234567890",
        "0000000000000000",
        "ffffffffffffffff",
      ];

      for (const gid of validGids) {
        mockTransport.mockResult = gid;
        await downloadMethods.pause(gid);
        expect(mockTransport.lastMethod).toBe("aria2.pause");
        expect(mockTransport.lastParams).toEqual([gid]);
      }
    });
  });

  describe("unpause", () => {
    it("should call transport with correct GID", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      const result = await downloadMethods.unpause(testGid);

      expect(result).toBe(testGid);
      expect(mockTransport.lastMethod).toBe("aria2.unpause");
      expect(mockTransport.lastParams).toEqual([testGid]);
    });

    it("should validate GID format", async () => {
      await expect(downloadMethods.unpause("invalid-gid")).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("remove", () => {
    it("should call transport with correct GID", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      const result = await downloadMethods.remove(testGid);

      expect(result).toBe(testGid);
      expect(mockTransport.lastMethod).toBe("aria2.remove");
      expect(mockTransport.lastParams).toEqual([testGid]);
    });

    it("should validate GID format", async () => {
      await expect(downloadMethods.remove("invalid-gid")).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("forceRemove", () => {
    it("should call transport with correct GID", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      const result = await downloadMethods.forceRemove(testGid);

      expect(result).toBe(testGid);
      expect(mockTransport.lastMethod).toBe("aria2.forceRemove");
      expect(mockTransport.lastParams).toEqual([testGid]);
    });

    it("should validate GID format", async () => {
      await expect(downloadMethods.forceRemove("invalid-gid")).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("GID validation", () => {
    it("should reject GIDs that are too short", async () => {
      await expect(downloadMethods.pause("123456789abcdef")).rejects.toThrow(
        ValidationError,
      );
    });

    it("should reject GIDs that are too long", async () => {
      await expect(downloadMethods.pause("1234567890abcdef0")).rejects.toThrow(
        ValidationError,
      );
    });

    it("should reject GIDs with invalid characters", async () => {
      await expect(downloadMethods.pause("123456789abcdefg")).rejects.toThrow(
        ValidationError,
      );
      await expect(downloadMethods.pause("123456789abcde-f")).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("URI validation", () => {
    it("should accept HTTP and HTTPS URIs", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      await downloadMethods.addUri(["https://example.com/file.zip"]);
      expect(mockTransport.lastMethod).toBe("aria2.addUri");

      await downloadMethods.addUri(["http://example.com/file.zip"]);
      expect(mockTransport.lastMethod).toBe("aria2.addUri");
    });

    it("should accept FTP URIs", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      await downloadMethods.addUri(["ftp://example.com/file.zip"]);
      expect(mockTransport.lastMethod).toBe("aria2.addUri");
    });

    it("should accept magnet URIs", async () => {
      const testGid = "1234567890abcdef";
      mockTransport.mockResult = testGid;

      await downloadMethods.addUri(["magnet:?xt=urn:btih:1234567890abcdef"]);
      expect(mockTransport.lastMethod).toBe("aria2.addUri");
    });
  });
});
