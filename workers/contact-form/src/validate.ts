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
  return input
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s>][\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
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
