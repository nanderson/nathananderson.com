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
