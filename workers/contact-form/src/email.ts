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
  resendApiKey: string,
): Promise<{ success: boolean; error?: string }> {
  const subject = formatEmailSubject(fields.firstName, fields.lastName, fields.company);
  const body = formatEmailBody(fields, meta);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Contact Form <noreply@nathananderson.com>",
        to: [toEmail],
        subject,
        text: body,
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
