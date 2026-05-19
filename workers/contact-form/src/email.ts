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
    const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: "noreply@nathananderson.com", name: "Contact Form" },
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
