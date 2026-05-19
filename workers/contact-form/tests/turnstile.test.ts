import { describe, it, expect, vi } from "vitest";
import { verifyTurnstile } from "../src/turnstile";

describe("verifyTurnstile", () => {
  it("returns true for valid token", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const result = await verifyTurnstile("valid-token", "test-secret", "1.2.3.4");
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns false for invalid token", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false }), { status: 200 })
    );

    const result = await verifyTurnstile("bad-token", "test-secret", "1.2.3.4");
    expect(result).toBe(false);
  });

  it("returns false on network error", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    const result = await verifyTurnstile("token", "test-secret", "1.2.3.4");
    expect(result).toBe(false);
  });
});
