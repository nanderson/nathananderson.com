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
