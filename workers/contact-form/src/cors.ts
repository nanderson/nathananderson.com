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
