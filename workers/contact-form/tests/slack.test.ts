import { describe, it, expect, vi } from "vitest";
import { sendSlackNotification } from "../src/slack";

describe("sendSlackNotification", () => {
  it("sends formatted message to webhook", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const result = await sendSlackNotification(
      "https://hooks.slack.com/test",
      {
        firstName: "Nathan",
        lastName: "Anderson",
        email: "nathan@test.com",
        phone: "(210) 555-1234",
        company: "Acme",
        message: "I need a CTO",
      },
      { ip: "1.2.3.4", userAgent: "Chrome/125", timestamp: "2026-05-19T10:00:00Z" },
    );

    expect(result.success).toBe(true);

    const fetchCall = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.text).toContain("Nathan Anderson");
    expect(body.text).toContain("Acme");
    expect(body.text).toContain("I need a CTO");
  });

  it("returns error on webhook failure", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(new Response("error", { status: 500 }));

    const result = await sendSlackNotification(
      "https://hooks.slack.com/test",
      { firstName: "A", lastName: "B", email: "a@b.com", phone: "1", company: "C", message: "D" },
      { ip: "1.2.3.4", userAgent: "Bot", timestamp: "2026-05-19T10:00:00Z" },
    );

    expect(result.success).toBe(false);
  });
});
