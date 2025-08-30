import { expect } from "@std/expect";
import { beforeEach, describe, it } from "@std/testing/bdd";

import { StatusMethods } from "../../src/methods/status.ts";
import { JsonRpcTransport } from "../../src/transport.ts";
import { ValidationError } from "../../src/types/errors.ts";
import { DownloadStatus } from "../../src/types/download.ts";

// Mock transport for testing
class MockTransport {
  public lastMethod: string = "";
  public lastParams: unknown[] = [];
  public mockResult: unknown = {};
  public shouldThrow: Error | null = null;

  async call(method: string, params: unknown[]): Promise<unknown> {
    this.lastMethod = method;
    this.lastParams = params;

    if (this.shouldThrow) {
      const error = this.shouldThrow;
      this.shouldThrow = null; // Reset for next call
      throw error;
    }

    return this.mockResult;
  }
}

describe("StatusMethods", () => {
  let statusMethods: StatusMethods;
  let mockTransport: MockTransport;

  beforeEach(() => {
    mockTransport = new MockTransport();
    statusMethods = new StatusMethods(
      mockTransport as unknown as JsonRpcTransport,
    );
  });

  describe("tellStatus", () => {
    const validGid = "0123456789abcdef";
    const mockStatusResponse = {
      gid: validGid,
      status: "active",
      totalLength: "1000000",
      completedLength: "500000",
      uploadLength: "0",
      downloadSpeed: "1024",
      uploadSpeed: "0",
      connections: "1",
      dir: "/downloads",
      files: [
        {
          index: "1",
          path: "/downloads/file.txt",
          length: "1000000",
          completedLength: "500000",
          selected: "true",
          uris: [
            {
              uri: "http://example.com/file.txt",
              status: "used",
            },
          ],
        },
      ],
    };

    it("should retrieve status for valid GID", async () => {
      mockTransport.mockResult = mockStatusResponse;

      const result = await statusMethods.tellStatus(validGid);

      expect(mockTransport.lastMethod).toBe("aria2.tellStatus");
      expect(mockTransport.lastParams).toEqual([validGid]);
      expect(result.gid).toBe(validGid);
      expect(result.status).toBe("active");
      expect(result.totalLength).toBe("1000000");
      expect(result.files.length).toBe(1);
    });

    it("should retrieve status with key filtering", async () => {
      const keys = ["gid", "status", "totalLength"];
      const filteredResponse = {
        gid: validGid,
        status: "active",
        totalLength: "1000000",
        completedLength: "500000",
        uploadLength: "0",
        downloadSpeed: "1024",
        uploadSpeed: "0",
        connections: "1",
        dir: "/downloads",
        files: [],
      };

      mockTransport.mockResult = filteredResponse;

      const result = await statusMethods.tellStatus(validGid, keys);

      expect(mockTransport.lastMethod).toBe("aria2.tellStatus");
      expect(mockTransport.lastParams).toEqual([validGid, keys]);
      expect(result.gid).toBe(validGid);
      expect(result.status).toBe("active");
    });

    it("should validate GID format", async () => {
      await expect(statusMethods.tellStatus("invalid-gid")).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellStatus("invalid-gid")).rejects.toThrow(
        "GID must be a 16-character hexadecimal string",
      );
    });

    it("should validate empty GID", async () => {
      await expect(statusMethods.tellStatus("")).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellStatus("")).rejects.toThrow(
        "GID must be a non-empty string",
      );
    });

    it("should validate keys parameter", async () => {
      await expect(statusMethods.tellStatus(validGid, [])).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellStatus(validGid, [])).rejects.toThrow(
        "Keys array cannot be empty",
      );

      await expect(statusMethods.tellStatus(validGid, ["valid", ""])).rejects
        .toThrow(
          ValidationError,
        );
      await expect(statusMethods.tellStatus(validGid, ["valid", ""])).rejects
        .toThrow(
          "All keys must be non-empty strings",
        );
    });

    it("should handle optional fields gracefully", async () => {
      const responseWithOptionals = {
        ...mockStatusResponse,
        bitfield: "ff00ff00",
        infoHash: "abcdef1234567890",
        numSeeders: "5",
        errorCode: undefined,
        errorMessage: null,
        bittorrent: {
          announceList: [["http://tracker1.com"], ["http://tracker2.com"]],
          comment: "Test torrent",
          info: {
            name: "test.torrent",
          },
        },
      };

      mockTransport.mockResult = responseWithOptionals;

      const result = await statusMethods.tellStatus(validGid);

      expect(result.bitfield).toBe("ff00ff00");
      expect(result.infoHash).toBe("abcdef1234567890");
      expect(result.numSeeders).toBe("5");
      expect(result.errorCode).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
      expect(result.bittorrent?.comment).toBe("Test torrent");
      expect(result.bittorrent?.announceList?.length).toBe(2);
    });

    it("should validate required fields", async () => {
      const incompleteResponse = {
        gid: validGid,
        status: "active",
        // Missing required fields
      };

      mockTransport.mockResult = incompleteResponse;

      await expect(statusMethods.tellStatus(validGid)).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellStatus(validGid)).rejects.toThrow(
        "Missing required field",
      );
    });

    it("should validate status values", async () => {
      const invalidStatusResponse = {
        ...mockStatusResponse,
        status: "invalid-status",
      };

      mockTransport.mockResult = invalidStatusResponse;

      await expect(statusMethods.tellStatus(validGid)).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellStatus(validGid)).rejects.toThrow(
        "Invalid status value",
      );
    });
  });

  describe("tellActive", () => {
    const mockActiveResponse = [
      {
        gid: "0123456789abcdef",
        status: "active",
        totalLength: "1000000",
        completedLength: "500000",
        uploadLength: "0",
        downloadSpeed: "1024",
        uploadSpeed: "0",
        connections: "1",
        dir: "/downloads",
        files: [],
      },
    ];

    it("should retrieve active downloads", async () => {
      mockTransport.mockResult = mockActiveResponse;

      const result = await statusMethods.tellActive();

      expect(mockTransport.lastMethod).toBe("aria2.tellActive");
      expect(mockTransport.lastParams).toEqual([]);
      expect(result.length).toBe(1);
      expect(result[0].status).toBe("active");
    });

    it("should retrieve active downloads with key filtering", async () => {
      const keys = ["gid", "status"];
      mockTransport.mockResult = mockActiveResponse;

      const result = await statusMethods.tellActive(keys);

      expect(mockTransport.lastMethod).toBe("aria2.tellActive");
      expect(mockTransport.lastParams).toEqual([keys]);
      expect(result.length).toBe(1);
    });

    it("should handle empty active downloads list", async () => {
      mockTransport.mockResult = [];

      const result = await statusMethods.tellActive();

      expect(result.length).toBe(0);
    });

    it("should validate keys parameter", async () => {
      await expect(statusMethods.tellActive([])).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellActive([])).rejects.toThrow(
        "Keys array cannot be empty",
      );
    });
  });

  describe("tellWaiting", () => {
    const mockWaitingResponse = [
      {
        gid: "fedcba9876543210",
        status: "waiting",
        totalLength: "2000000",
        completedLength: "0",
        uploadLength: "0",
        downloadSpeed: "0",
        uploadSpeed: "0",
        connections: "0",
        dir: "/downloads",
        files: [],
      },
    ];

    it("should retrieve waiting downloads with pagination", async () => {
      mockTransport.mockResult = mockWaitingResponse;

      const result = await statusMethods.tellWaiting(0, 10);

      expect(mockTransport.lastMethod).toBe("aria2.tellWaiting");
      expect(mockTransport.lastParams).toEqual([0, 10]);
      expect(result.length).toBe(1);
      expect(result[0].status).toBe("waiting");
    });

    it("should retrieve waiting downloads with key filtering", async () => {
      const keys = ["gid", "status"];
      mockTransport.mockResult = mockWaitingResponse;

      const result = await statusMethods.tellWaiting(5, 20, keys);

      expect(mockTransport.lastMethod).toBe("aria2.tellWaiting");
      expect(mockTransport.lastParams).toEqual([5, 20, keys]);
      expect(result.length).toBe(1);
    });

    it("should validate pagination parameters", async () => {
      await expect(statusMethods.tellWaiting(-1, 10)).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellWaiting(-1, 10)).rejects.toThrow(
        "Offset must be a non-negative integer",
      );

      await expect(statusMethods.tellWaiting(0, 0)).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellWaiting(0, 0)).rejects.toThrow(
        "Number must be a positive integer",
      );

      await expect(statusMethods.tellWaiting(0, 1001)).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellWaiting(0, 1001)).rejects.toThrow(
        "Number cannot exceed 1000",
      );

      await expect(statusMethods.tellWaiting(0.5, 10)).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellWaiting(0.5, 10)).rejects.toThrow(
        "Offset must be a non-negative integer",
      );

      await expect(statusMethods.tellWaiting(0, 10.5)).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellWaiting(0, 10.5)).rejects.toThrow(
        "Number must be a positive integer",
      );
    });
  });

  describe("tellStopped", () => {
    const mockStoppedResponse = [
      {
        gid: "abcdef0123456789",
        status: "complete",
        totalLength: "1500000",
        completedLength: "1500000",
        uploadLength: "0",
        downloadSpeed: "0",
        uploadSpeed: "0",
        connections: "0",
        dir: "/downloads",
        files: [],
      },
    ];

    it("should retrieve stopped downloads with pagination", async () => {
      mockTransport.mockResult = mockStoppedResponse;

      const result = await statusMethods.tellStopped(0, 5);

      expect(mockTransport.lastMethod).toBe("aria2.tellStopped");
      expect(mockTransport.lastParams).toEqual([0, 5]);
      expect(result.length).toBe(1);
      expect(result[0].status).toBe("complete");
    });

    it("should retrieve stopped downloads with key filtering", async () => {
      const keys = ["gid", "status", "totalLength"];
      mockTransport.mockResult = mockStoppedResponse;

      const result = await statusMethods.tellStopped(10, 15, keys);

      expect(mockTransport.lastMethod).toBe("aria2.tellStopped");
      expect(mockTransport.lastParams).toEqual([10, 15, keys]);
      expect(result.length).toBe(1);
    });

    it("should validate pagination parameters", async () => {
      await expect(statusMethods.tellStopped(-5, 10)).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellStopped(-5, 10)).rejects.toThrow(
        "Offset must be a non-negative integer",
      );

      await expect(statusMethods.tellStopped(0, -1)).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellStopped(0, -1)).rejects.toThrow(
        "Number must be a positive integer",
      );
    });
  });

  describe("response parsing", () => {
    const validGid = "0123456789abcdef";

    it("should parse complex download status with all fields", async () => {
      const complexResponse = {
        gid: validGid,
        status: "active",
        totalLength: "1000000000",
        completedLength: "500000000",
        uploadLength: "1000000",
        bitfield: "ff00ff00ff00ff00",
        downloadSpeed: "2048000",
        uploadSpeed: "512000",
        infoHash: "abcdef1234567890abcdef1234567890abcdef12",
        numSeeders: "10",
        seeder: "false",
        pieceLength: "262144",
        numPieces: "3815",
        connections: "4",
        errorCode: undefined,
        errorMessage: undefined,
        followedBy: ["fedcba9876543210"],
        following: undefined,
        belongsTo: undefined,
        dir: "/home/user/downloads",
        files: [
          {
            index: "1",
            path: "/home/user/downloads/movie.mkv",
            length: "800000000",
            completedLength: "400000000",
            selected: "true",
            uris: [
              {
                uri: "http://example.com/movie.mkv",
                status: "used",
              },
              {
                uri: "http://mirror.com/movie.mkv",
                status: "waiting",
              },
            ],
          },
          {
            index: "2",
            path: "/home/user/downloads/subtitle.srt",
            length: "200000000",
            completedLength: "100000000",
            selected: "true",
            uris: [
              {
                uri: "http://example.com/subtitle.srt",
                status: "used",
              },
            ],
          },
        ],
        bittorrent: {
          announceList: [
            ["http://tracker1.example.com:8080/announce"],
            [
              "http://tracker2.example.com:8080/announce",
              "http://backup.example.com:8080/announce",
            ],
          ],
          comment: "High quality movie with subtitles",
          creationDate: "1640995200",
          mode: "multi",
          info: {
            name: "Movie Collection",
          },
        },
      };

      mockTransport.mockResult = complexResponse;

      const result = await statusMethods.tellStatus(validGid);

      // Validate basic fields
      expect(result.gid).toBe(validGid);
      expect(result.status).toBe("active");
      expect(result.totalLength).toBe("1000000000");
      expect(result.bitfield).toBe("ff00ff00ff00ff00");
      expect(result.infoHash).toBe("abcdef1234567890abcdef1234567890abcdef12");
      expect(result.followedBy).toEqual(["fedcba9876543210"]);

      // Validate files array
      expect(result.files.length).toBe(2);
      expect(result.files[0].path).toBe("/home/user/downloads/movie.mkv");
      expect(result.files[0].uris.length).toBe(2);
      expect(result.files[0].uris[0].status).toBe("used");
      expect(result.files[0].uris[1].status).toBe("waiting");

      // Validate BitTorrent info
      expect(result.bittorrent?.comment).toBe(
        "High quality movie with subtitles",
      );
      expect(result.bittorrent?.announceList?.length).toBe(2);
      expect(result.bittorrent?.announceList?.[1].length).toBe(2);
      expect(result.bittorrent?.info?.name).toBe("Movie Collection");
    });

    it("should handle malformed response data", async () => {
      mockTransport.mockResult = "invalid response";

      await expect(statusMethods.tellStatus(validGid)).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellStatus(validGid)).rejects.toThrow(
        "Invalid download status response format",
      );
    });

    it("should handle malformed files array", async () => {
      const responseWithBadFiles = {
        gid: validGid,
        status: "active",
        totalLength: "1000000",
        completedLength: "500000",
        uploadLength: "0",
        downloadSpeed: "1024",
        uploadSpeed: "0",
        connections: "1",
        dir: "/downloads",
        files: ["not an object"],
      };

      mockTransport.mockResult = responseWithBadFiles;

      await expect(statusMethods.tellStatus(validGid)).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellStatus(validGid)).rejects.toThrow(
        "File at index 0 must be an object",
      );
    });

    it("should handle malformed URI status", async () => {
      const responseWithBadUriStatus = {
        gid: validGid,
        status: "active",
        totalLength: "1000000",
        completedLength: "500000",
        uploadLength: "0",
        downloadSpeed: "1024",
        uploadSpeed: "0",
        connections: "1",
        dir: "/downloads",
        files: [
          {
            index: "1",
            path: "/downloads/file.txt",
            length: "1000000",
            completedLength: "500000",
            selected: "true",
            uris: [
              {
                uri: "http://example.com/file.txt",
                status: "invalid-status",
              },
            ],
          },
        ],
      };

      mockTransport.mockResult = responseWithBadUriStatus;

      await expect(statusMethods.tellStatus(validGid)).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellStatus(validGid)).rejects.toThrow(
        "must be 'used' or 'waiting'",
      );
    });

    it("should handle array parsing errors in tellActive", async () => {
      mockTransport.mockResult = [
        {
          gid: validGid,
          status: "active",
          totalLength: "1000000",
          completedLength: "500000",
          uploadLength: "0",
          downloadSpeed: "1024",
          uploadSpeed: "0",
          connections: "1",
          dir: "/downloads",
          files: [],
        },
        "invalid item",
      ];

      await expect(statusMethods.tellActive()).rejects.toThrow(
        ValidationError,
      );
      await expect(statusMethods.tellActive()).rejects.toThrow(
        "Invalid download status at index 1",
      );
    });
  });

  describe("type safety", () => {
    it("should ensure return types match DownloadStatus interface", async () => {
      const mockResponse = {
        gid: "0123456789abcdef",
        status: "complete",
        totalLength: "1000000",
        completedLength: "1000000",
        uploadLength: "0",
        downloadSpeed: "0",
        uploadSpeed: "0",
        connections: "0",
        dir: "/downloads",
        files: [],
      };

      mockTransport.mockResult = mockResponse;

      const result: DownloadStatus = await statusMethods.tellStatus(
        "0123456789abcdef",
      );

      // TypeScript compilation ensures type safety
      expect(typeof result.gid).toBe("string");
      expect(typeof result.status).toBe("string");
      expect(typeof result.totalLength).toBe("string");
      expect(Array.isArray(result.files)).toBe(true);
    });

    it("should ensure array methods return DownloadStatus arrays", async () => {
      const mockResponse = [
        {
          gid: "0123456789abcdef",
          status: "waiting",
          totalLength: "1000000",
          completedLength: "0",
          uploadLength: "0",
          downloadSpeed: "0",
          uploadSpeed: "0",
          connections: "0",
          dir: "/downloads",
          files: [],
        },
      ];

      mockTransport.mockResult = mockResponse;

      const result: DownloadStatus[] = await statusMethods.tellWaiting(0, 10);

      // TypeScript compilation ensures type safety
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(typeof result[0].gid).toBe("string");
    });
  });
});
