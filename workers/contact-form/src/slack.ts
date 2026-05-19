import type { ContactFields, RequestMeta } from "./airtable";

export async function sendSlackNotification(
  webhookUrl: string,
  fields: ContactFields,
  meta: RequestMeta,
): Promise<{ success: boolean; error?: string }> {
  const text = [
    `*New Contact Form Submission*`,
    ``,
    `*Name:* ${fields.firstName} ${fields.lastName}`,
    `*Email:* ${fields.email}`,
    `*Phone:* ${fields.phone}`,
    `*Company:* ${fields.company}`,
    ``,
    `*Message:*`,
    `> ${fields.message.replace(/\n/g, "\n> ")}`,
    ``,
    `---`,
    `IP: ${meta.ip} | ${meta.userAgent}`,
    `${meta.timestamp}`,
  ].join("\n");

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      return { success: false, error: `Slack returned ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
