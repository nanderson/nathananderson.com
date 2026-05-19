import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, vi, beforeEach } from "vitest";
import worker from "../src/index";

const baseEnv = {
  ALLOWED_ORIGIN: "https://nathananderson.com",
  TURNSTILE_SECRET_KEY: "test-secret",
  AIRTABLE_API_KEY: "test-key",
  AIRTABLE_BASE_ID: "test-base",
  AIRTABLE_TABLE_NAME: "Contacts",
  SLACK_WEBHOOK_URL: "https://hooks.slack.com/test",
  NOTIFICATION_EMAIL: "nathan@test.com",
};

const validBody = {
  firstName: "Nathan",
  lastName: "Anderson",
  email: "nathan@example.com",
  phone: "(210) 555-1234",
  company: "Acme Corp",
  message: "I need a CTO",
  turnstileToken: "valid-token",
  honeypot: "",
};

describe("contact form handler", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("turnstile")) {
        return Promise.resolve(new Response(JSON.stringify({ success: true })));
      }
      if (url.includes("airtable")) {
        return Promise.resolve(new Response(JSON.stringify({ id: "rec123" })));
      }
      if (url.includes("slack")) {
        return Promise.resolve(new Response("ok"));
      }
      if (url.includes("mailchannels")) {
        return Promise.resolve(new Response("", { status: 202 }));
      }
      return Promise.resolve(new Response("", { status: 404 }));
    });
  });

  it("returns success for valid submission", async () => {
    const request = new Request("https://worker.dev/api/contact", {
      method: "POST",
      headers: {
        Origin: "https://nathananderson.com",
        "Content-Type": "application/json",
        "CF-Connecting-IP": "203.0.113.45",
        "User-Agent": "Chrome/125",
      },
      body: JSON.stringify(validBody),
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, baseEnv as any, ctx);
    await waitOnExecutionContext(ctx);

    const json = (await response.json()) as { success: boolean };
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 200 silently for honeypot submissions", async () => {
    const request = new Request("https://worker.dev/api/contact", {
      method: "POST",
      headers: {
        Origin: "https://nathananderson.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...validBody, honeypot: "bot-filled" }),
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, baseEnv as any, ctx);
    await waitOnExecutionContext(ctx);

    const json = (await response.json()) as { success: boolean };
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 400 for validation errors", async () => {
    const request = new Request("https://worker.dev/api/contact", {
      method: "POST",
      headers: {
        Origin: "https://nathananderson.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...validBody, email: "bad" }),
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, baseEnv as any, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
  });

  it("returns 403 for failed Turnstile verification", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("turnstile")) {
        return Promise.resolve(new Response(JSON.stringify({ success: false })));
      }
      return Promise.resolve(new Response("ok"));
    });

    const request = new Request("https://worker.dev/api/contact", {
      method: "POST",
      headers: {
        Origin: "https://nathananderson.com",
        "Content-Type": "application/json",
        "CF-Connecting-IP": "1.2.3.4",
      },
      body: JSON.stringify(validBody),
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, baseEnv as any, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(403);
  });
});
