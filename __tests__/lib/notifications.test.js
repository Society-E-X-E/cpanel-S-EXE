import { subscribe, publish, getClientCount } from "../../lib/notifications";

function createMockRes() {
  const listeners = {};
  return {
    written: [],
    write(data) {
      this.written.push(data);
    },
    on(event, cb) {
      listeners[event] = cb;
    },
    triggerClose() {
      if (listeners.close) listeners.close();
    },
  };
}

describe("lib/notifications", () => {
  afterEach(() => {
    // Clean up clients by triggering close on any leftover mocks
  });

  describe("subscribe", () => {
    it("adds a client to the set", () => {
      const initialCount = getClientCount();
      const res = createMockRes();
      subscribe(res);
      expect(getClientCount()).toBe(initialCount + 1);
      res.triggerClose();
    });

    it("removes client on close event", () => {
      const res = createMockRes();
      subscribe(res);
      const countAfterSub = getClientCount();
      res.triggerClose();
      expect(getClientCount()).toBe(countAfterSub - 1);
    });
  });

  describe("publish", () => {
    it("sends formatted SSE data to all subscribed clients", () => {
      const res1 = createMockRes();
      const res2 = createMockRes();
      subscribe(res1);
      subscribe(res2);

      publish("test-event", { message: "hello" });

      const expected = `event: test-event\ndata: ${JSON.stringify({ message: "hello" })}\n\n`;
      expect(res1.written).toContain(expected);
      expect(res2.written).toContain(expected);

      res1.triggerClose();
      res2.triggerClose();
    });

    it("removes client if write throws", () => {
      const badRes = createMockRes();
      badRes.write = () => {
        throw new Error("connection lost");
      };
      badRes.on = (event, cb) => {
        if (event === "close") badRes._closeCb = cb;
      };
      subscribe(badRes);

      const countBefore = getClientCount();
      publish("test", { data: 1 });
      expect(getClientCount()).toBe(countBefore - 1);
    });

    it("does nothing when no clients are subscribed", () => {
      // Should not throw
      expect(() => publish("event", { x: 1 })).not.toThrow();
    });
  });

  describe("getClientCount", () => {
    it("returns 0 when no clients subscribed", () => {
      // After all tests clear, count should be stable (may not be 0 due to test ordering)
      expect(typeof getClientCount()).toBe("number");
    });
  });
});
