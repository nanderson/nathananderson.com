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
