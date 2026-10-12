import { describe, expect, it, vi } from "vitest";
import type { ResultNotice } from "../src/lib/notify.js";
import {
  memoryPushStore,
  parseFollow,
  parseSubscription,
  sendNotices,
  vapidKeys,
  wants,
  type PushSender,
} from "../src/lib/push.js";

const keys = { p256dh: "p", auth: "a" };
const sub = (endpoint: string) => ({ endpoint, keys });

describe("parseSubscription", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://jmt17.google.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/QAbc",
    "https://wns2-bl2p.notify.windows.com/w/?token=abc",
  ])("accepts %s", (endpoint) => {
    expect(parseSubscription(sub(endpoint))).toEqual(sub(endpoint));
  });

  it.each([
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://fcm.googleapis.com.evil.example/abc",
    "https://evilpush.apple.com.example/abc",
    "https://notgoogle.com/abc",
    "https://169.254.169.254/latest",
    "not a url",
  ])("refuses %s", (endpoint) => {
    expect(parseSubscription(sub(endpoint))).toBeNull();
  });

  it("refuses missing keys", () => {
    expect(parseSubscription({ endpoint: "https://fcm.googleapis.com/x" })).toBeNull();
    expect(parseSubscription(null)).toBeNull();
  });
});

describe("follows", () => {
  it("normalizes and de-duplicates followed events", () => {
    expect(parseFollow({ all: false, events: ["Mens  U19 4+", "mens u19 4+", 7, ""] })).toEqual({
      all: false,
      events: ["mens u19 4+"],
    });
  });

  it("caps the number of followed events", () => {
    const events = Array.from({ length: 150 }, (_, i) => `Event ${i}`);
    expect(parseFollow({ events }).events).toHaveLength(100);
  });

  it("matches all results or listed events", () => {
    expect(wants({ all: true, events: [] }, "anything")).toBe(true);
    expect(wants({ all: false, events: ["mens u19 4+"] }, "mens u19 4+")).toBe(true);
    expect(wants({ all: false, events: ["mens u19 4+"] }, "womens u19 8+")).toBe(false);
  });
});

describe("vapidKeys", () => {
  it("generates keys once and reuses them", async () => {
    const store = memoryPushStore();
    const generate = vi.fn(() => ({ publicKey: "pub", privateKey: "priv" }));
    expect(await vapidKeys(store, generate)).toEqual({ publicKey: "pub", privateKey: "priv" });
    await vapidKeys(store, generate);
    expect(generate).toHaveBeenCalledTimes(1);
  });
});

describe("sendNotices", () => {
  const notice = (eventKey: string): ResultNotice => ({
    regattaId: "r1",
    eventKey,
    kind: "result",
    title: "Head of the Lake",
    body: `${eventKey}: bow 1 1st of 2`,
    url: "/regatta/r1",
  });

  async function storeWith(...follows: [string, boolean, string[]][]) {
    const store = memoryPushStore();
    for (const [endpoint, all, events] of follows) {
      await store.put({ subscription: sub(endpoint), follow: { all, events }, createdAt: "" });
    }
    return store;
  }

  it("sends each notice only to followers of its event", async () => {
    const store = await storeWith(["https://a", true, []], ["https://b", false, ["womens u19 8+"]]);
    const send = vi.fn<PushSender>(async () => {});
    const result = await sendNotices([notice("mens u19 4+"), notice("womens u19 8+")], store, send);
    expect(result).toEqual({ sent: 3, removed: 0 });
    expect(send.mock.calls.map(([s, p]) => [s.endpoint, p.tag])).toEqual(
      expect.arrayContaining([
        ["https://a", "r1:mens u19 4+"],
        ["https://a", "r1:womens u19 8+"],
        ["https://b", "r1:womens u19 8+"],
      ]),
    );
  });

  it("removes subscriptions the push service says are gone, and keeps others", async () => {
    const store = await storeWith(["https://gone", true, []], ["https://flaky", true, []]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const send = vi.fn<PushSender>(async (s) => {
      throw Object.assign(new Error("no"), {
        statusCode: s.endpoint === "https://gone" ? 410 : 500,
      });
    });
    expect(await sendNotices([notice("x"), notice("y")], store, send)).toEqual({
      sent: 0,
      removed: 1,
    });
    // Once gone, the expired subscription isn't tried again for the second notice.
    expect(send.mock.calls.filter(([s]) => s.endpoint === "https://gone")).toHaveLength(1);
    expect((await store.list()).map((s) => s.subscription.endpoint)).toEqual(["https://flaky"]);
  });

  it("does nothing without notices", async () => {
    const send = vi.fn<PushSender>();
    expect(await sendNotices([], await storeWith(["https://a", true, []]), send)).toEqual({
      sent: 0,
      removed: 0,
    });
    expect(send).not.toHaveBeenCalled();
  });
});
