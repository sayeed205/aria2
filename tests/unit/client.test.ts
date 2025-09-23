import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

import { Aria2 } from "../../src/client.ts";
import { ConfigurationError } from "../../src/types/errors.ts";
import type {
  Aria2NotificationType,
  Aria2NotificationPayloads,
} from "../../src/types/notifications.ts";

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

    await t.step("notifications", async (t) => {
      // Install a global MockWebSocket for notification testing (minimal)
      const originalWebSocket = globalThis.WebSocket;
      let sentMessages: string[] = [];
      let _onopen: (() => void) | undefined;
      let _onmessage: ((event: { data: string }) => void) | undefined;
      class MockWebSocket {
        static OPEN = 1;
        readyState = MockWebSocket.OPEN;
        sent: string[] = [];
        url: string;
        onopen: (() => void) | null = null;
        onclose: ((ev: { code: number; reason: string }) => void) | null = null;
        onerror: ((ev: any) => void) | null = null;
        onmessage: ((ev: { data: string }) => void) | null = null;
        constructor(url: string) {
          this.url = url;
          _onopen = this.onopen ? () => this.onopen!() : undefined;
          _onmessage = this.onmessage ? (ev) => this.onmessage!(ev) : undefined;
          setTimeout(() => {
            if (this.onopen) this.onopen();
          }, 2);
        }
        send(data: string) {
          this.sent.push(data);
          sentMessages.push(data);
        }
        close() {}
        receiveNotification(method: string, params: any) {
          if (this.onmessage) {
            this.onmessage({
              data: JSON.stringify({ method, params: [params] }),
            });
          }
        }
      }
      (globalThis as any).WebSocket = MockWebSocket;

      try {
        const client = new Aria2({ baseUrl: "ws://example-mock" });

        let calledType: Aria2NotificationType | undefined;
        let calledPayload: any = undefined;
        const unsubscribe = client.on("onDownloadStart", (payload) => {
          calledType = "onDownloadStart";
          calledPayload = payload;
        });

        // Simulate a notification from the server
        // @ts-ignore
        const ws: MockWebSocket =
          client["transport"]["ws"] ||
          (client["transport"]["ws"] = new MockWebSocket("ws://example-mock"));
        ws.receiveNotification("aria2.onDownloadStart", { gid: "xyz789" });

        await new Promise((r) => setTimeout(r, 5));
        assertEquals(calledType, "onDownloadStart");
        assertEquals(calledPayload && calledPayload.gid, "xyz789");

        // Test unsubscribe (should not call again)
        calledType = undefined;
        unsubscribe();
        ws.receiveNotification("aria2.onDownloadStart", { gid: "second" });
        await new Promise((r) => setTimeout(r, 5));
        assertEquals(calledType, undefined);

        // Multiple listeners for different types
        let pausePayload: any = undefined;
        client.on("onDownloadPause", (payload) => {
          pausePayload = payload;
        });
        ws.receiveNotification("aria2.onDownloadPause", { gid: "paused" });
        await new Promise((r) => setTimeout(r, 5));
        assertEquals(pausePayload && pausePayload.gid, "paused");
      } finally {
        (globalThis as any).WebSocket = originalWebSocket;
      }
    });
  });
});
