import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const baseEnv = {
  ALLOWED_ORIGIN: "https://nathananderson.com",
  TURNSTILE_SECRET_KEY: "test-secret",
  AIRTABLE_API_KEY: "test-key",
  AIRTABLE_BASE_ID: "test-base",
  AIRTABLE_TABLE_NAME: "test-table",
  SLACK_WEBHOOK_URL: "https://hooks.slack.com/test",
  NOTIFICATION_EMAIL: "test@test.com",
};

describe("CORS", () => {
  it("responds to OPTIONS preflight with correct headers", async () => {
    const request = new Request("https://worker.dev/api/contact", {
      method: "OPTIONS",
      headers: {
        Origin: "https://nathananderson.com",
        "Access-Control-Request-Method": "POST",
      },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, baseEnv as any, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://nathananderson.com");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  it("rejects requests from disallowed origins", async () => {
    const request = new Request("https://worker.dev/api/contact", {
      method: "POST",
      headers: {
        Origin: "https://evil.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, baseEnv as any, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(403);
  });

  it("rejects non-POST requests to /api/contact", async () => {
    const request = new Request("https://worker.dev/api/contact", {
      method: "GET",
      headers: { Origin: "https://nathananderson.com" },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, baseEnv as any, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
  });
});
