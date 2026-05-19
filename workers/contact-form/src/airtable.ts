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

export interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tableName: string;
}

export async function writeToAirtable(
  fields: ContactFields,
  meta: RequestMeta,
  config: AirtableConfig,
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableName)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          "First Name": fields.firstName,
          "Last Name": fields.lastName,
          "Email": fields.email,
          "Phone": fields.phone,
          "Company": fields.company,
          "Message": fields.message,
          "IP Address": meta.ip,
          "User Agent": meta.userAgent,
          "Submitted At": meta.timestamp,
        },
      }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: { message?: string } };
      return { success: false, error: body.error?.message || `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
