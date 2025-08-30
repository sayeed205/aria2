import { expect } from "@std/expect";
import { beforeEach, describe, it } from "@std/testing/bdd";

import { GlobalMethods } from "../../src/methods/global.ts";
import { JsonRpcTransport } from "../../src/transport.ts";
import { ValidationError } from "../../src/types/errors.ts";
import { GlobalOptions } from "../../src/types/options.ts";
import { GlobalStat } from "../../src/types/global.ts";

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

describe("GlobalMethods", () => {
  let globalMethods: GlobalMethods;
  let mockTransport: MockTransport;

  beforeEach(() => {
    mockTransport = new MockTransport();
    globalMethods = new GlobalMethods(
      mockTransport as unknown as JsonRpcTransport,
    );
  });

  describe("getGlobalOption", () => {
    it("should call transport with correct method and no parameters", async () => {
      const mockOptions: GlobalOptions = {
        "max-concurrent-downloads": 5,
        "max-download-limit": "1M",
        "log-level": "info",
      };
      mockTransport.mockResult = mockOptions;

      const result = await globalMethods.getGlobalOption();

      expect(result).toEqual(mockOptions);
      expect(mockTransport.lastMethod).toBe("aria2.getGlobalOption");
      expect(mockTransport.lastParams).toEqual([]);
    });
  });

  describe("changeGlobalOption", () => {
    it("should call transport with formatted options", async () => {
      mockTransport.mockResult = "OK";

      const options: Partial<GlobalOptions> = {
        "max-concurrent-downloads": 10,
        "max-download-limit": "2M",
        "log-level": "debug",
        "enable-dht": true,
        "bt-seed-unverified": false,
      };

      const result = await globalMethods.changeGlobalOption(options);

      expect(result).toBe("OK");
      expect(mockTransport.lastMethod).toBe("aria2.changeGlobalOption");
      expect(mockTransport.lastParams).toEqual([{
        "max-concurrent-downloads": "10",
        "max-download-limit": "2M",
        "log-level": "debug",
        "enable-dht": "true",
        "bt-seed-unverified": "false",
      }]);
    });

    it("should handle string options correctly", async () => {
      mockTransport.mockResult = "OK";

      const options: Partial<GlobalOptions> = {
        dir: "/downloads",
        "user-agent": "MyApp/1.0",
      };

      await globalMethods.changeGlobalOption(options);

      expect(mockTransport.lastParams).toEqual([{
        dir: "/downloads",
        "user-agent": "MyApp/1.0",
      }]);
    });

    it("should handle array options correctly", async () => {
      mockTransport.mockResult = "OK";

      const options: Partial<GlobalOptions> = {
        header: ["User-Agent: MyApp", "Accept: */*"],
      };

      await globalMethods.changeGlobalOption(options);

      expect(mockTransport.lastParams).toEqual([{
        header: "User-Agent: MyApp,Accept: */*",
      }]);
    });

    it("should throw ValidationError for null options", async () => {
      // @ts-expect-error Testing invalid input
      await expect(globalMethods.changeGlobalOption(null)).rejects.toThrow(
        ValidationError,
      );
      // @ts-expect-error Testing invalid input
      await expect(globalMethods.changeGlobalOption(null)).rejects.toThrow(
        "Global options must be an object",
      );
    });

    it("should throw ValidationError for empty options", async () => {
      await expect(globalMethods.changeGlobalOption({})).rejects.toThrow(
        ValidationError,
      );
      await expect(globalMethods.changeGlobalOption({})).rejects.toThrow(
        "Global options cannot be empty",
      );
    });

    it("should skip null and undefined option values", async () => {
      mockTransport.mockResult = "OK";

      const options = {
        "max-concurrent-downloads": 5,
        dir: null as any,
        out: undefined as any,
      };

      await globalMethods.changeGlobalOption(options);

      // Should only include the non-null/undefined values
      expect(mockTransport.lastParams).toEqual([{
        "max-concurrent-downloads": "5",
      }]);
    });

    it("should validate numeric options", async () => {
      const invalidOptions = {
        "max-concurrent-downloads": -1,
      };

      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow(ValidationError);
      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow(
          "Global option 'max-concurrent-downloads' must be a non-negative number",
        );
    });

    it("should validate boolean options", async () => {
      const invalidOptions = {
        "enable-dht": "not-a-boolean" as any,
      };

      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow(ValidationError);
      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow("Global option 'enable-dht' must be a boolean");
    });

    it("should validate string options", async () => {
      const invalidOptions = {
        dir: 123 as any,
      };

      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow(ValidationError);
      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow("Global option 'dir' must be a non-empty string");
    });

    it("should validate empty string options", async () => {
      const invalidOptions = {
        dir: "",
      };

      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow(ValidationError);
      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow("Global option 'dir' must be a non-empty string");
    });

    it("should validate log-level enum", async () => {
      const invalidOptions = {
        "log-level": "invalid-level" as any,
      };

      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow(ValidationError);
      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow(
          "Global option 'log-level' must be one of: debug, info, notice, warn, error",
        );
    });

    it("should validate header array", async () => {
      const invalidOptions = {
        header: "not-an-array" as any,
      };

      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow(ValidationError);
      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow("Global option 'header' must be an array");
    });

    it("should validate header array elements", async () => {
      const invalidOptions = {
        header: ["valid-header", ""],
      };

      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow(ValidationError);
      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow("All headers must be non-empty strings");
    });

    it("should accept valid log levels", async () => {
      mockTransport.mockResult = "OK";

      const validLevels: Array<"debug" | "info" | "notice" | "warn" | "error"> =
        [
          "debug",
          "info",
          "notice",
          "warn",
          "error",
        ];

      for (const level of validLevels) {
        await globalMethods.changeGlobalOption({ "log-level": level });
        expect(mockTransport.lastParams).toEqual([{ "log-level": level }]);
      }
    });
  });

  describe("getGlobalStat", () => {
    it("should call transport with correct method and no parameters", async () => {
      const mockStats: GlobalStat = {
        downloadSpeed: "1024",
        uploadSpeed: "512",
        numActive: "2",
        numWaiting: "1",
        numStopped: "5",
        numStoppedTotal: "10",
      };
      mockTransport.mockResult = mockStats;

      const result = await globalMethods.getGlobalStat();

      expect(result).toEqual(mockStats);
      expect(mockTransport.lastMethod).toBe("aria2.getGlobalStat");
      expect(mockTransport.lastParams).toEqual([]);
    });
  });

  describe("option formatting", () => {
    it("should skip undefined and null values", async () => {
      mockTransport.mockResult = "OK";

      const options = {
        "max-concurrent-downloads": 5,
        dir: undefined as any,
        out: null as any,
      };

      await globalMethods.changeGlobalOption(options);

      expect(mockTransport.lastParams).toEqual([{
        "max-concurrent-downloads": "5",
      }]);
    });

    it("should convert numbers to strings", async () => {
      mockTransport.mockResult = "OK";

      const options: Partial<GlobalOptions> = {
        "max-concurrent-downloads": 10,
        split: 8,
        timeout: 30,
      };

      await globalMethods.changeGlobalOption(options);

      expect(mockTransport.lastParams).toEqual([{
        "max-concurrent-downloads": "10",
        split: "8",
        timeout: "30",
      }]);
    });

    it("should convert booleans to strings", async () => {
      mockTransport.mockResult = "OK";

      const options: Partial<GlobalOptions> = {
        "enable-dht": true,
        "bt-seed-unverified": false,
        continue: true,
      };

      await globalMethods.changeGlobalOption(options);

      expect(mockTransport.lastParams).toEqual([{
        "enable-dht": "true",
        "bt-seed-unverified": "false",
        continue: "true",
      }]);
    });
  });

  describe("validation edge cases", () => {
    it("should accept zero as valid numeric value", async () => {
      mockTransport.mockResult = "OK";

      const options: Partial<GlobalOptions> = {
        "max-concurrent-downloads": 0,
        split: 0,
      };

      await globalMethods.changeGlobalOption(options);

      expect(mockTransport.lastParams).toEqual([{
        "max-concurrent-downloads": "0",
        split: "0",
      }]);
    });

    it("should handle whitespace-only strings", async () => {
      const invalidOptions = {
        dir: "   ",
      };

      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow(ValidationError);
      await expect(globalMethods.changeGlobalOption(invalidOptions)).rejects
        .toThrow("Global option 'dir' must be a non-empty string");
    });

    it("should validate unknown option keys", async () => {
      mockTransport.mockResult = "OK";

      // Unknown options should still be processed (aria2 might support them)
      const options = {
        "unknown-option": "value",
      };

      await globalMethods.changeGlobalOption(options);

      expect(mockTransport.lastParams).toEqual([{
        "unknown-option": "value",
      }]);
    });
  });
});
