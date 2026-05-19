# Contact Form Worker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Jotform iframe contact form with a self-hosted HTML form backed by a Cloudflare Worker that stores submissions in Airtable and notifies via Slack + email.

**Architecture:** Native HTML form in the Hugo contact section submits JSON to a Cloudflare Worker. The Worker validates Turnstile, sanitizes input, then fans out to Airtable, Slack, and CF Email Workers independently.

**Tech Stack:** Hugo templates, vanilla JS, Cloudflare Workers (TypeScript), Wrangler, Vitest, Cloudflare Turnstile, Airtable REST API, Slack Webhooks, CF Email Workers.

**Design doc:** `docs/plans/2026-05-19-contact-form-worker-design.md`

---

### Task 1: Scaffold the Worker project

**Files:**
- Create: `workers/contact-form/package.json`
- Create: `workers/contact-form/wrangler.toml`
- Create: `workers/contact-form/tsconfig.json`
- Create: `workers/contact-form/src/index.ts`

**Step 1: Create the Worker directory and initialize**

Run: `mkdir -p workers/contact-form/src`

**Step 2: Create `workers/contact-form/package.json`**

```json
{
  "name": "contact-form-worker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.8.0",
    "@cloudflare/workers-types": "^4.20250510.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0",
    "wrangler": "^4.14.0"
  }
}
```

**Step 3: Create `workers/contact-form/wrangler.toml`**

```toml
name = "contact-form-worker"
main = "src/index.ts"
compatibility_date = "2025-05-01"

[vars]
ALLOWED_ORIGIN = "https://nathananderson.com"

# Secrets (set via `wrangler secret put`):
# TURNSTILE_SECRET_KEY
# AIRTABLE_API_KEY
# AIRTABLE_BASE_ID
# AIRTABLE_TABLE_NAME
# SLACK_WEBHOOK_URL
# NOTIFICATION_EMAIL

[send_email]
# Enable CF Email Workers
```

**Step 4: Create `workers/contact-form/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 5: Create a minimal `workers/contact-form/src/index.ts` stub**

```typescript
export interface Env {
  ALLOWED_ORIGIN: string;
  TURNSTILE_SECRET_KEY: string;
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  AIRTABLE_TABLE_NAME: string;
  SLACK_WEBHOOK_URL: string;
  NOTIFICATION_EMAIL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response(JSON.stringify({ success: false, error: "Not implemented" }), {
      status: 501,
      headers: { "Content-Type": "application/json" },
    });
  },
};
```

**Step 6: Install dependencies**

Run: `cd workers/contact-form && npm install`

**Step 7: Verify the Worker starts**

Run: `cd workers/contact-form && npx wrangler dev --port 8787`
Expected: Worker starts and responds on `http://localhost:8787`
Press Ctrl+C to stop.

**Step 8: Commit**

```bash
git add workers/contact-form/
git commit -m "feat: scaffold contact form Worker project"
```

---

### Task 2: Implement CORS and request routing

**Files:**
- Modify: `workers/contact-form/src/index.ts`
- Create: `workers/contact-form/src/cors.ts`
- Create: `workers/contact-form/tests/cors.test.ts`

**Step 1: Create `workers/contact-form/tests/cors.test.ts` with failing tests**

```typescript
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
```

**Step 2: Create Vitest config for Workers**

Create `workers/contact-form/vitest.config.ts`:

```typescript
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
      },
    },
  },
});
```

**Step 3: Run tests to verify they fail**

Run: `cd workers/contact-form && npx vitest run`
Expected: FAIL (stub returns 501 for everything)

**Step 4: Create `workers/contact-form/src/cors.ts`**

```typescript
export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export function handlePreflight(allowedOrigin: string, request: Request): Response | null {
  const origin = request.headers.get("Origin") || "";
  if (request.method === "OPTIONS") {
    if (origin === allowedOrigin) {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    return new Response(null, { status: 403 });
  }
  return null;
}

export function isAllowedOrigin(allowedOrigin: string, request: Request): boolean {
  const origin = request.headers.get("Origin") || "";
  return origin === allowedOrigin;
}
```

**Step 5: Update `workers/contact-form/src/index.ts` with routing**

```typescript
import { corsHeaders, handlePreflight, isAllowedOrigin } from "./cors";

export interface Env {
  ALLOWED_ORIGIN: string;
  TURNSTILE_SECRET_KEY: string;
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  AIRTABLE_TABLE_NAME: string;
  SLACK_WEBHOOK_URL: string;
  NOTIFICATION_EMAIL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    const preflight = handlePreflight(env.ALLOWED_ORIGIN, request);
    if (preflight) return preflight;

    // Only allow POST
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check origin
    if (!isAllowedOrigin(env.ALLOWED_ORIGIN, request)) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // TODO: Handle form submission
    const headers = {
      "Content-Type": "application/json",
      ...corsHeaders(env.ALLOWED_ORIGIN),
    };

    return new Response(JSON.stringify({ success: false, error: "Not implemented" }), {
      status: 501,
      headers,
    });
  },
};
```

**Step 6: Run tests to verify they pass**

Run: `cd workers/contact-form && npx vitest run`
Expected: All 3 CORS tests PASS

**Step 7: Commit**

```bash
git add workers/contact-form/
git commit -m "feat: add CORS handling and request routing to Worker"
```

---

### Task 3: Implement input validation and honeypot

**Files:**
- Create: `workers/contact-form/src/validate.ts`
- Create: `workers/contact-form/tests/validate.test.ts`

**Step 1: Create `workers/contact-form/tests/validate.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { validateContactForm, sanitize } from "../src/validate";

describe("validateContactForm", () => {
  const validData = {
    firstName: "Nathan",
    lastName: "Anderson",
    email: "nathan@example.com",
    phone: "(210) 555-1234",
    company: "Acme Corp",
    message: "I need a CTO",
    turnstileToken: "token-123",
    honeypot: "",
  };

  it("accepts valid form data", () => {
    const result = validateContactForm(validData);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects when required fields are missing", () => {
    const result = validateContactForm({ ...validData, firstName: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("First name is required");
  });

  it("rejects invalid email format", () => {
    const result = validateContactForm({ ...validData, email: "not-an-email" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid email address");
  });

  it("detects honeypot submissions", () => {
    const result = validateContactForm({ ...validData, honeypot: "spam bot filled this" });
    expect(result.honeypot).toBe(true);
  });

  it("rejects missing turnstile token", () => {
    const result = validateContactForm({ ...validData, turnstileToken: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Security verification failed");
  });

  it("trims whitespace from all fields", () => {
    const result = validateContactForm({ ...validData, firstName: "  Nathan  " });
    expect(result.valid).toBe(true);
    expect(result.data!.firstName).toBe("Nathan");
  });
});

describe("sanitize", () => {
  it("strips HTML tags", () => {
    expect(sanitize("<script>alert('xss')</script>Hello")).toBe("Hello");
  });

  it("trims whitespace", () => {
    expect(sanitize("  hello  ")).toBe("hello");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd workers/contact-form && npx vitest run`
Expected: FAIL (module not found)

**Step 3: Create `workers/contact-form/src/validate.ts`**

```typescript
export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  turnstileToken: string;
  honeypot: string;
}

export interface ValidationResult {
  valid: boolean;
  honeypot: boolean;
  errors: string[];
  data?: ContactFormData;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitize(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

export function validateContactForm(raw: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  // Check honeypot first
  const honeypotValue = String(raw.honeypot || "");
  if (honeypotValue.length > 0) {
    return { valid: true, honeypot: true, errors: [] };
  }

  // Sanitize all fields
  const data: ContactFormData = {
    firstName: sanitize(String(raw.firstName || "")),
    lastName: sanitize(String(raw.lastName || "")),
    email: sanitize(String(raw.email || "")),
    phone: sanitize(String(raw.phone || "")),
    company: sanitize(String(raw.company || "")),
    message: sanitize(String(raw.message || "")),
    turnstileToken: String(raw.turnstileToken || "").trim(),
    honeypot: "",
  };

  // Required field checks
  if (!data.firstName) errors.push("First name is required");
  if (!data.lastName) errors.push("Last name is required");
  if (!data.email) errors.push("Email is required");
  else if (!EMAIL_REGEX.test(data.email)) errors.push("Invalid email address");
  if (!data.phone) errors.push("Phone number is required");
  if (!data.company) errors.push("Company name is required");
  if (!data.message) errors.push("Message is required");
  if (!data.turnstileToken) errors.push("Security verification failed");

  return {
    valid: errors.length === 0,
    honeypot: false,
    errors,
    data: errors.length === 0 ? data : undefined,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd workers/contact-form && npx vitest run`
Expected: All validation tests PASS

**Step 5: Commit**

```bash
git add workers/contact-form/
git commit -m "feat: add input validation and sanitization for contact form"
```

---

### Task 4: Implement Turnstile verification

**Files:**
- Create: `workers/contact-form/src/turnstile.ts`
- Create: `workers/contact-form/tests/turnstile.test.ts`

**Step 1: Create `workers/contact-form/tests/turnstile.test.ts`**

```typescript
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
```

**Step 2: Run tests to verify they fail**

Run: `cd workers/contact-form && npx vitest run`
Expected: FAIL (module not found)

**Step 3: Create `workers/contact-form/src/turnstile.ts`**

```typescript
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  token: string,
  secretKey: string,
  remoteIp: string,
): Promise<boolean> {
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: remoteIp,
      }),
    });

    const result = (await response.json()) as { success: boolean };
    return result.success;
  } catch {
    return false;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd workers/contact-form && npx vitest run`
Expected: All Turnstile tests PASS

**Step 5: Commit**

```bash
git add workers/contact-form/
git commit -m "feat: add Turnstile verification"
```

---

### Task 5: Implement Airtable integration

**Files:**
- Create: `workers/contact-form/src/airtable.ts`
- Create: `workers/contact-form/tests/airtable.test.ts`

**Step 1: Create `workers/contact-form/tests/airtable.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";
import { writeToAirtable } from "../src/airtable";

describe("writeToAirtable", () => {
  it("sends correct payload to Airtable API", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "rec123" }), { status: 200 })
    );

    const result = await writeToAirtable(
      {
        firstName: "Nathan",
        lastName: "Anderson",
        email: "nathan@test.com",
        phone: "(210) 555-1234",
        company: "Acme",
        message: "Hello",
      },
      { ip: "1.2.3.4", userAgent: "Chrome/125", timestamp: "2026-05-19T10:00:00Z" },
      { apiKey: "key123", baseId: "app123", tableName: "Contacts" },
    );

    expect(result.success).toBe(true);

    const fetchCall = (global.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toBe("https://api.airtable.com/v0/app123/Contacts");

    const body = JSON.parse(fetchCall[1].body);
    expect(body.fields["First Name"]).toBe("Nathan");
    expect(body.fields["IP Address"]).toBe("1.2.3.4");
  });

  it("returns error on API failure", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Unauthorized" } }), { status: 401 })
    );

    const result = await writeToAirtable(
      { firstName: "A", lastName: "B", email: "a@b.com", phone: "123", company: "C", message: "D" },
      { ip: "1.2.3.4", userAgent: "Bot", timestamp: "2026-05-19T10:00:00Z" },
      { apiKey: "bad", baseId: "app", tableName: "T" },
    );

    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd workers/contact-form && npx vitest run`
Expected: FAIL

**Step 3: Create `workers/contact-form/src/airtable.ts`**

```typescript
export interface ContactFields {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  message: string;
}

export interface RequestMeta {
  ip: string;
  userAgent: string;
  timestamp: string;
}

export interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tableName: string;
}

export async function writeToAirtable(
  fields: ContactFields,
  meta: RequestMeta,
  config: AirtableConfig,
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableName)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          "First Name": fields.firstName,
          "Last Name": fields.lastName,
          "Email": fields.email,
          "Phone": fields.phone,
          "Company": fields.company,
          "Message": fields.message,
          "IP Address": meta.ip,
          "User Agent": meta.userAgent,
          "Submitted At": meta.timestamp,
        },
      }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: { message?: string } };
      return { success: false, error: body.error?.message || `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd workers/contact-form && npx vitest run`
Expected: All Airtable tests PASS

**Step 5: Commit**

```bash
git add workers/contact-form/
git commit -m "feat: add Airtable integration for contact form storage"
```

---

### Task 6: Implement Slack notification

**Files:**
- Create: `workers/contact-form/src/slack.ts`
- Create: `workers/contact-form/tests/slack.test.ts`

**Step 1: Create `workers/contact-form/tests/slack.test.ts`**

```typescript
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
```

**Step 2: Run tests to verify they fail**

Run: `cd workers/contact-form && npx vitest run`
Expected: FAIL

**Step 3: Create `workers/contact-form/src/slack.ts`**

```typescript
import type { ContactFields, RequestMeta } from "./airtable";

export async function sendSlackNotification(
  webhookUrl: string,
  fields: ContactFields,
  meta: RequestMeta,
): Promise<{ success: boolean; error?: string }> {
  const text = [
    `*New Contact Form Submission*`,
    ``,
    `*Name:* ${fields.firstName} ${fields.lastName}`,
    `*Email:* ${fields.email}`,
    `*Phone:* ${fields.phone}`,
    `*Company:* ${fields.company}`,
    ``,
    `*Message:*`,
    `> ${fields.message.replace(/\n/g, "\n> ")}`,
    ``,
    `---`,
    `IP: ${meta.ip} | ${meta.userAgent}`,
    `${meta.timestamp}`,
  ].join("\n");

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      return { success: false, error: `Slack returned ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd workers/contact-form && npx vitest run`
Expected: All Slack tests PASS

**Step 5: Commit**

```bash
git add workers/contact-form/
git commit -m "feat: add Slack webhook notification for contact form"
```

---

### Task 7: Implement email notification

**Files:**
- Create: `workers/contact-form/src/email.ts`
- Create: `workers/contact-form/tests/email.test.ts`

**Step 1: Create `workers/contact-form/tests/email.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { formatEmailBody, formatEmailSubject } from "../src/email";

describe("email formatting", () => {
  it("formats the subject line correctly", () => {
    const subject = formatEmailSubject("Nathan", "Anderson", "Acme Corp");
    expect(subject).toBe("New contact: Nathan Anderson from Acme Corp");
  });

  it("formats the email body with all fields", () => {
    const body = formatEmailBody(
      {
        firstName: "Nathan",
        lastName: "Anderson",
        email: "nathan@test.com",
        phone: "(210) 555-1234",
        company: "Acme",
        message: "Hello there",
      },
      { ip: "1.2.3.4", userAgent: "Chrome/125", timestamp: "2026-05-19T10:00:00Z" },
    );

    expect(body).toContain("Nathan Anderson");
    expect(body).toContain("nathan@test.com");
    expect(body).toContain("Hello there");
    expect(body).toContain("1.2.3.4");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd workers/contact-form && npx vitest run`
Expected: FAIL

**Step 3: Create `workers/contact-form/src/email.ts`**

Note: CF Email Workers require `send_email` binding in wrangler.toml and the `EmailMessage` API. For the initial implementation, we'll format the email content and use the `MailChannels` free tier (available to all CF Workers) as CF Email Workers require DNS setup. The actual send mechanism can be swapped once email routing is configured.

```typescript
import type { ContactFields, RequestMeta } from "./airtable";

export function formatEmailSubject(firstName: string, lastName: string, company: string): string {
  return `New contact: ${firstName} ${lastName} from ${company}`;
}

export function formatEmailBody(fields: ContactFields, meta: RequestMeta): string {
  return [
    `New Contact Form Submission`,
    ``,
    `Name: ${fields.firstName} ${fields.lastName}`,
    `Email: ${fields.email}`,
    `Phone: ${fields.phone}`,
    `Company: ${fields.company}`,
    ``,
    `Message:`,
    fields.message,
    ``,
    `---`,
    `IP: ${meta.ip}`,
    `User Agent: ${meta.userAgent}`,
    `Submitted: ${meta.timestamp}`,
  ].join("\n");
}

export async function sendEmail(
  toEmail: string,
  fields: ContactFields,
  meta: RequestMeta,
): Promise<{ success: boolean; error?: string }> {
  const subject = formatEmailSubject(fields.firstName, fields.lastName, fields.company);
  const body = formatEmailBody(fields, meta);

  try {
    // Uses MailChannels API (free for CF Workers)
    // Can be swapped for CF Email Workers once email routing is configured
    const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: `noreply@nathananderson.com`, name: "Contact Form" },
        subject,
        content: [{ type: "text/plain", value: body }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Email send failed: ${response.status} ${text}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd workers/contact-form && npx vitest run`
Expected: All email formatting tests PASS

**Step 5: Commit**

```bash
git add workers/contact-form/
git commit -m "feat: add email notification for contact form submissions"
```

---

### Task 8: Wire everything together in the main handler

**Files:**
- Modify: `workers/contact-form/src/index.ts`
- Create: `workers/contact-form/tests/handler.test.ts`

**Step 1: Create `workers/contact-form/tests/handler.test.ts`**

```typescript
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
    // Mock all external fetches to succeed
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
    // Should NOT have called any external services
    expect(global.fetch).not.toHaveBeenCalled();
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
```

**Step 2: Run tests to verify they fail**

Run: `cd workers/contact-form && npx vitest run`
Expected: FAIL (handler still returns 501)

**Step 3: Update `workers/contact-form/src/index.ts` with full handler**

```typescript
import { corsHeaders, handlePreflight, isAllowedOrigin } from "./cors";
import { validateContactForm } from "./validate";
import { verifyTurnstile } from "./turnstile";
import { writeToAirtable, type ContactFields, type RequestMeta } from "./airtable";
import { sendSlackNotification } from "./slack";
import { sendEmail } from "./email";

export interface Env {
  ALLOWED_ORIGIN: string;
  TURNSTILE_SECRET_KEY: string;
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  AIRTABLE_TABLE_NAME: string;
  SLACK_WEBHOOK_URL: string;
  NOTIFICATION_EMAIL: string;
}

function jsonResponse(body: Record<string, unknown>, status: number, origin?: string): Response {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) Object.assign(headers, corsHeaders(origin));
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    const preflight = handlePreflight(env.ALLOWED_ORIGIN, request);
    if (preflight) return preflight;

    // Only allow POST
    if (request.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    // Check origin
    if (!isAllowedOrigin(env.ALLOWED_ORIGIN, request)) {
      return jsonResponse({ success: false, error: "Forbidden" }, 403);
    }

    const origin = env.ALLOWED_ORIGIN;

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400, origin);
    }

    // Validate
    const validation = validateContactForm(body);

    // Honeypot triggered - return success silently
    if (validation.honeypot) {
      return jsonResponse({ success: true }, 200, origin);
    }

    if (!validation.valid) {
      return jsonResponse({ success: false, errors: validation.errors }, 400, origin);
    }

    const data = validation.data!;

    // Verify Turnstile
    const remoteIp = request.headers.get("CF-Connecting-IP") || "unknown";
    const turnstileOk = await verifyTurnstile(data.turnstileToken, env.TURNSTILE_SECRET_KEY, remoteIp);
    if (!turnstileOk) {
      return jsonResponse({ success: false, error: "Security verification failed" }, 403, origin);
    }

    // Build contact fields and metadata
    const fields: ContactFields = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      message: data.message,
    };

    const meta: RequestMeta = {
      ip: remoteIp,
      userAgent: request.headers.get("User-Agent") || "unknown",
      timestamp: new Date().toISOString(),
    };

    // Fan out to all services independently
    const [airtableResult, slackResult, emailResult] = await Promise.allSettled([
      writeToAirtable(fields, meta, {
        apiKey: env.AIRTABLE_API_KEY,
        baseId: env.AIRTABLE_BASE_ID,
        tableName: env.AIRTABLE_TABLE_NAME,
      }),
      sendSlackNotification(env.SLACK_WEBHOOK_URL, fields, meta),
      sendEmail(env.NOTIFICATION_EMAIL, fields, meta),
    ]);

    // Log any failures
    const failures: string[] = [];
    if (airtableResult.status === "rejected" || (airtableResult.status === "fulfilled" && !airtableResult.value.success)) {
      failures.push("airtable");
      console.error("Airtable failed:", airtableResult.status === "rejected" ? airtableResult.reason : airtableResult.value.error);
    }
    if (slackResult.status === "rejected" || (slackResult.status === "fulfilled" && !slackResult.value.success)) {
      failures.push("slack");
      console.error("Slack failed:", slackResult.status === "rejected" ? slackResult.reason : slackResult.value.error);
    }
    if (emailResult.status === "rejected" || (emailResult.status === "fulfilled" && !emailResult.value.success)) {
      failures.push("email");
      console.error("Email failed:", emailResult.status === "rejected" ? emailResult.reason : emailResult.value.error);
    }

    // Success if at least one notification succeeded
    if (failures.length === 3) {
      return jsonResponse({ success: false, error: "Failed to process submission" }, 500, origin);
    }

    return jsonResponse({ success: true }, 200, origin);
  },
};
```

**Step 4: Run tests to verify they pass**

Run: `cd workers/contact-form && npx vitest run`
Expected: All tests PASS (CORS + validation + handler)

**Step 5: Commit**

```bash
git add workers/contact-form/
git commit -m "feat: wire up full contact form handler with fan-out to services"
```

---

### Task 9: Build the HTML form in the Hugo template

**Files:**
- Modify: `layouts/partials/sections/contact.html`

**Step 1: Read the current template**

Read: `layouts/partials/sections/contact.html`
This is the file with the Jotform iframe (lines 12-16).

**Step 2: Replace the Jotform iframe with the native form**

Replace lines 12-16 (the `<!-- CUSTOM DIV SECTION -->` block) with:

```html
                    <!-- Contact Form -->
                    <form id="contact-form" class="contact-form" novalidate>
                        <div class="form-row">
                            <div class="form-group form-group-half">
                                <label for="firstName">First Name <span class="required">*</span></label>
                                <input type="text" id="firstName" name="firstName" required autocomplete="given-name">
                            </div>
                            <div class="form-group form-group-half">
                                <label for="lastName">Last Name <span class="required">*</span></label>
                                <input type="text" id="lastName" name="lastName" required autocomplete="family-name">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group form-group-half">
                                <label for="email">Email Address <span class="required">*</span></label>
                                <input type="email" id="email" name="email" required autocomplete="email">
                            </div>
                            <div class="form-group form-group-half">
                                <label for="phone">Phone Number <span class="required">*</span></label>
                                <input type="tel" id="phone" name="phone" required autocomplete="tel" placeholder="(555) 555-1234">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="company">Company Name <span class="required">*</span></label>
                            <input type="text" id="company" name="company" required autocomplete="organization">
                        </div>
                        <div class="form-group">
                            <label for="message">What would you like to chat about? <span class="required">*</span></label>
                            <textarea id="message" name="message" rows="4" required></textarea>
                        </div>

                        <!-- Honeypot - hidden from real users -->
                        <div style="position:absolute;left:-9999px" aria-hidden="true">
                            <input type="text" name="honeypot" tabindex="-1" autocomplete="off">
                        </div>

                        <!-- Turnstile widget -->
                        <div class="cf-turnstile" data-sitekey="{{ .Site.Params.contact.turnstileSiteKey | default "" }}" data-callback="onTurnstileSuccess"></div>

                        <div id="form-error" class="form-error" style="display:none"></div>

                        <div class="form-group text-center">
                            <button type="submit" id="submit-btn" class="btn">
                                <span class="btn-text">{{ .Site.Params.contact.btnName | default "Contact Me" }}</span>
                                <span class="btn-loading" style="display:none">Sending...</span>
                            </button>
                        </div>
                    </form>

                    <!-- Success message (hidden by default) -->
                    <div id="form-success" style="display:none" class="form-success">
                        <h4>Thanks for reaching out!</h4>
                        <p>I'll get back to you soon.</p>
                    </div>

                    <!-- Turnstile script -->
                    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

                    <!-- Form submission script -->
                    <script>
                    (function() {
                        var turnstileToken = '';
                        window.onTurnstileSuccess = function(token) { turnstileToken = token; };

                        var form = document.getElementById('contact-form');
                        var submitBtn = document.getElementById('submit-btn');
                        var btnText = submitBtn.querySelector('.btn-text');
                        var btnLoading = submitBtn.querySelector('.btn-loading');
                        var errorDiv = document.getElementById('form-error');
                        var successDiv = document.getElementById('form-success');

                        var WORKER_URL = '{{ .Site.Params.contact.workerUrl | default "" }}';

                        form.addEventListener('submit', function(e) {
                            e.preventDefault();
                            errorDiv.style.display = 'none';
                            btnText.style.display = 'none';
                            btnLoading.style.display = 'inline';
                            submitBtn.disabled = true;

                            var data = {
                                firstName: form.firstName.value,
                                lastName: form.lastName.value,
                                email: form.email.value,
                                phone: form.phone.value,
                                company: form.company.value,
                                message: form.message.value,
                                turnstileToken: turnstileToken,
                                honeypot: form.honeypot.value
                            };

                            fetch(WORKER_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(data)
                            })
                            .then(function(res) { return res.json(); })
                            .then(function(json) {
                                if (json.success) {
                                    form.style.display = 'none';
                                    successDiv.style.display = 'block';
                                } else {
                                    var msg = json.errors ? json.errors.join(', ') : (json.error || 'Something went wrong. Please try again.');
                                    errorDiv.textContent = msg;
                                    errorDiv.style.display = 'block';
                                }
                            })
                            .catch(function() {
                                errorDiv.textContent = 'Network error. Please check your connection and try again.';
                                errorDiv.style.display = 'block';
                            })
                            .finally(function() {
                                btnText.style.display = 'inline';
                                btnLoading.style.display = 'none';
                                submitBtn.disabled = false;
                            });
                        });
                    })();
                    </script>
                    <!-- End Contact Form -->
```

**Step 3: Verify Hugo builds without errors**

Run: `cd /Users/nathan/.claudette/workspaces/nathananderson.com/jagged-oregano && hugo --gc`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add layouts/partials/sections/contact.html
git commit -m "feat: replace Jotform iframe with native contact form"
```

---

### Task 10: Add contact form CSS

**Files:**
- Modify: `static/css/custom.css`

**Step 1: Read the current CSS for the contact section**

Read: `static/css/custom.css` (lines 650-694, the `#contact` section)

**Step 2: Append contact form styles to the end of the `#contact` section**

After line 694 (`#contact .btn { ... }`), insert:

```css
/* Contact Form Styles */
.contact-form {
  text-align: left;
  max-width: 100%;
}

.contact-form .form-row {
  display: flex;
  gap: var(--space-md);
}

.contact-form .form-group {
  margin-bottom: var(--space-lg);
  width: 100%;
}

.contact-form .form-group-half {
  flex: 1;
}

.contact-form label {
  display: block;
  font-weight: 600;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.contact-form .required {
  color: var(--error-color);
}

.contact-form input,
.contact-form textarea {
  width: 100%;
  padding: var(--space-md);
  border: 2px solid var(--bg-tertiary);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--font-size-base);
  color: var(--text-primary);
  background: var(--bg-primary);
  transition: border-color var(--transition-base), box-shadow var(--transition-base);
  box-sizing: border-box;
}

.contact-form input:focus,
.contact-form textarea:focus {
  border-color: var(--secondary-color);
  box-shadow: var(--focus-shadow);
  outline: none;
}

.contact-form input:invalid:not(:placeholder-shown),
.contact-form textarea:invalid:not(:placeholder-shown) {
  border-color: var(--error-color);
}

.contact-form textarea {
  resize: vertical;
  min-height: 100px;
}

.contact-form .btn {
  min-width: 200px;
}

.contact-form .btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.form-error {
  color: var(--error-color);
  background: rgba(220, 53, 69, 0.1);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-lg);
  font-size: var(--font-size-sm);
  text-align: center;
}

.form-success {
  text-align: center;
  padding: var(--space-2xl);
}

.form-success h4 {
  color: var(--success-color);
  margin-bottom: var(--space-md);
}

.form-success p {
  color: var(--text-secondary);
}

/* Turnstile widget centering */
.cf-turnstile {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-lg);
}

/* Dark mode contact form */
.dark .contact-form input,
.dark .contact-form textarea {
  background: var(--bg-secondary);
  border-color: var(--bg-tertiary);
  color: var(--text-primary);
}

/* Mobile: stack form rows */
@media (max-width: 575.98px) {
  .contact-form .form-row {
    flex-direction: column;
    gap: 0;
  }
}
```

**Step 3: Verify Hugo builds**

Run: `cd /Users/nathan/.claudette/workspaces/nathananderson.com/jagged-oregano && hugo --gc`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add static/css/custom.css
git commit -m "feat: add contact form styling with dark mode and mobile support"
```

---

### Task 11: Add hugo.toml configuration for form settings

**Files:**
- Modify: `hugo.toml`

**Step 1: Read the contact section config**

Read: `hugo.toml` (lines 358-365, the `[params.contact]` section)

**Step 2: Add the Worker URL and Turnstile site key to the contact config**

After `btnName = "Contact Me"` (line 364), add:

```toml
    workerUrl = ""  # Set to your Worker URL, e.g. https://contact-form-worker.your-subdomain.workers.dev/api/contact
    turnstileSiteKey = ""  # Set to your Cloudflare Turnstile site key
```

Note: Leave these empty in the committed config. The actual values will be set before deploying.

**Step 3: Verify Hugo builds**

Run: `cd /Users/nathan/.claudette/workspaces/nathananderson.com/jagged-oregano && hugo --gc`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add hugo.toml
git commit -m "feat: add Worker URL and Turnstile config to hugo.toml"
```

---

### Task 12: Add .gitignore entries for Worker artifacts

**Files:**
- Modify: `.gitignore`

**Step 1: Read current .gitignore**

Read: `.gitignore`

**Step 2: Append Worker-specific ignores**

Add to the end of `.gitignore`:

```
# Cloudflare Worker artifacts
workers/*/node_modules/
workers/*/.wrangler/
workers/*/dist/
```

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add Worker artifacts to .gitignore"
```

---

### Task 13: Manual deployment and testing checklist

This task is a manual checklist -- no code changes, just verification steps.

**Step 1: Set up Cloudflare Turnstile**

1. Go to Cloudflare dashboard > Turnstile
2. Add a new site for `nathananderson.com`
3. Choose "Managed" mode
4. Copy the **Site Key** (goes in `hugo.toml` `turnstileSiteKey`)
5. Copy the **Secret Key** (goes in Worker secrets)

**Step 2: Configure Worker secrets**

Run each command from `workers/contact-form/`:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put AIRTABLE_API_KEY
npx wrangler secret put AIRTABLE_BASE_ID
npx wrangler secret put AIRTABLE_TABLE_NAME
npx wrangler secret put SLACK_WEBHOOK_URL
npx wrangler secret put NOTIFICATION_EMAIL
```

**Step 3: Deploy the Worker**

```bash
cd workers/contact-form && npx wrangler deploy
```

Note the deployed URL (e.g. `https://contact-form-worker.your-subdomain.workers.dev`)

**Step 4: Update hugo.toml with real values**

Set `workerUrl` to the deployed Worker URL + `/api/contact`
Set `turnstileSiteKey` to the Turnstile site key

**Step 5: Test the Worker directly**

```bash
curl -X POST https://contact-form-worker.your-subdomain.workers.dev/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: https://nathananderson.com" \
  -d '{"firstName":"Test","lastName":"User","email":"test@test.com","phone":"5551234","company":"Test","message":"Hello","turnstileToken":"test","honeypot":""}'
```

Expected: 403 (Turnstile will fail with fake token, which confirms the Worker is running and validating)

**Step 6: Test on the live site**

Deploy the Hugo site, visit the contact form, fill it out, and submit. Verify:
- Airtable receives the record
- Slack receives the notification
- Email arrives

**Step 7: Configure rate limiting**

In Cloudflare dashboard > Security > WAF > Rate limiting rules:
- Create a rule for the Worker route
- Max 5 requests per IP per minute
- Action: Block

**Step 8: Remove Jotform (once confirmed working)**

After confirming everything works, the old Jotform iframe code is already gone from the template. Consider canceling the Jotform account if no longer needed.
