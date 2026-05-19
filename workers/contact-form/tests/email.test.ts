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
