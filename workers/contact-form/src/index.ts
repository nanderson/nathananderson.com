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
  RESEND_API_KEY: string;
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

    // Check path
    const url = new URL(request.url);
    if (url.pathname !== "/api/contact") {
      return jsonResponse({ success: false, error: "Not found" }, 404);
    }

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
      sendEmail(env.NOTIFICATION_EMAIL, fields, meta, env.RESEND_API_KEY),
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
