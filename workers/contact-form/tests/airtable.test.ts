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
