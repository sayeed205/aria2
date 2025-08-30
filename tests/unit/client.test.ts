import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

import { Aria2 } from "../../src/client.ts";
import { ConfigurationError } from "../../src/types/errors.ts";

Deno.test("Aria2 Client", async (t) => {
  await t.step("constructor", async (t) => {
    await t.step("should create client with default config", () => {
      const client = new Aria2();
      assertEquals(typeof client, "object");
    });

    await t.step("should create client with custom config", () => {
      const client = new Aria2({
        baseUrl: "http://localhost:6801/jsonrpc",
        secret: "test-secret",
        timeout: 5000,
      });
      assertEquals(typeof client, "object");
    });

    await t.step("should throw ConfigurationError for invalid baseUrl", () => {
      assertThrows(
        () => new Aria2({ baseUrl: "invalid-url" }),
        ConfigurationError,
        "Invalid baseUrl",
      );
    });

    await t.step("should throw ConfigurationError for invalid timeout", () => {
      assertThrows(
        () => new Aria2({ timeout: -1 }),
        ConfigurationError,
        "Timeout must be a positive integer",
      );
    });
  });

  await t.step("method integration", async (t) => {
    const client = new Aria2();

    await t.step("should have all download methods", () => {
      assertEquals(typeof client.addUri, "function");
      assertEquals(typeof client.addTorrent, "function");
      assertEquals(typeof client.addMetalink, "function");
      assertEquals(typeof client.pause, "function");
      assertEquals(typeof client.unpause, "function");
      assertEquals(typeof client.remove, "function");
      assertEquals(typeof client.forceRemove, "function");
    });

    await t.step("should have all status methods", () => {
      assertEquals(typeof client.tellStatus, "function");
      assertEquals(typeof client.tellActive, "function");
      assertEquals(typeof client.tellWaiting, "function");
      assertEquals(typeof client.tellStopped, "function");
    });

    await t.step("should have all global methods", () => {
      assertEquals(typeof client.getGlobalOption, "function");
      assertEquals(typeof client.changeGlobalOption, "function");
      assertEquals(typeof client.getGlobalStat, "function");
    });

    await t.step("should have all system methods", () => {
      assertEquals(typeof client.getVersion, "function");
      assertEquals(typeof client.shutdown, "function");
      assertEquals(typeof client.forceShutdown, "function");
      assertEquals(typeof client.saveSession, "function");
      assertEquals(typeof client.purgeDownloadResult, "function");
      assertEquals(typeof client.removeDownloadResult, "function");
    });
  });
});
