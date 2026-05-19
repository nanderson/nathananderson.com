# Contact Form: Jotform to Cloudflare Worker Migration

**Date:** 2026-05-19
**Status:** Approved
**Branch:** nathan-anderson/superpowers-brainstorm

## Goal

Replace the embedded Jotform contact form with a self-hosted HTML form backed by a Cloudflare Worker. The Worker stores submissions in Airtable and sends notifications via Slack and Cloudflare Email Workers.

## Architecture

```
Hugo Site (contact section)
  HTML Form + Turnstile + Vanilla JS
       |
       | POST /api/contact (JSON)
       v
Cloudflare Worker (contact-form-worker)
  1. Validate Turnstile token
  2. Validate & sanitize fields
  3. Write to Airtable ---------> Airtable API
  4. Send Slack notification ---> Slack Webhook
  5. Send email notification ---> CF Email Workers
  6. Return success/error JSON
```

**Two components, one repo:**

1. **Hugo template** -- `layouts/partials/sections/contact.html` replaces the Jotform iframe with a native form
2. **Worker** -- `workers/contact-form/` directory with Wrangler config, deployed independently

CORS allows `https://nathananderson.com` only. Form submits via `fetch()` with JSON body.

## Frontend

### Form Fields

| Field | HTML Type | Validation | Required |
|---|---|---|---|
| First Name | `text` | Required | Yes |
| Last Name | `text` | Required | Yes |
| Email Address | `email` | Email format | Yes |
| Phone Number | `tel` | Pattern for formatting | Yes |
| Company Name | `text` | Required | Yes |
| Message | `textarea` | Required | Yes |
| Turnstile | Widget | Managed mode | Yes |
| Honeypot | Hidden `text` | Must be empty | -- |

### Server-Side Captured Fields (Not Visible)

- **IP Address** -- from `CF-Connecting-IP` header
- **User-Agent** -- from `User-Agent` header
- **Timestamp** -- generated server-side

### Behavior

- Submits via `fetch()` (no page reload)
- Submit button shows loading spinner during submission
- Success: form hides, shows confirmation message ("Thanks, I'll be in touch")
- Error: inline error message, form stays filled for retry
- Turnstile renders in managed mode (shows challenge only when needed)

### Styling

Uses existing `custom.css` conventions. Colors: `#10036d` primary, `#0056fb` secondary. No CSS framework. No JS framework -- vanilla JS only.

## Cloudflare Worker

### Location

`workers/contact-form/` in the site repo.

### Tech Stack

Wrangler + TypeScript.

### Request Format

```
POST /api/contact
Content-Type: application/json

{
  "firstName": "...",
  "lastName": "...",
  "email": "...",
  "phone": "...",
  "company": "...",
  "message": "...",
  "turnstileToken": "...",
  "honeypot": ""
}
```

### Processing Steps

1. **CORS check** -- only allow `https://nathananderson.com`
2. **Honeypot check** -- if non-empty, return 200 silently
3. **Validate Turnstile** -- POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify`
4. **Validate & sanitize fields** -- trim, check required, validate email, sanitize
5. **Write to Airtable** -- POST to Airtable API with form fields + IP + User-Agent + timestamp
6. **Send Slack notification** -- POST to webhook with formatted message
7. **Send email notification** -- CF Email Workers to inbox
8. **Return JSON** -- `{ success: true }` or `{ success: false, error: "..." }`

### Error Handling

Steps 5-7 are independent. If one fails, the others still execute. Returns success as long as at least one notification method succeeded. Failures are logged.

### Environment Variables

Managed via `wrangler secret put`:

- `TURNSTILE_SECRET_KEY`
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_NAME`
- `SLACK_WEBHOOK_URL`
- `NOTIFICATION_EMAIL`

### Rate Limiting

Cloudflare dashboard rate limiting rules: max 5 requests per IP per minute to the Worker route.

## Notifications

### Slack

```
New Contact Form Submission

Name: {firstName} {lastName}
Email: {email}
Phone: {phone}
Company: {company}

Message:
> {message}

---
IP: {ip} | {userAgent}
{timestamp}
```

### Email

Plain text via CF Email Workers. Subject: `New contact: {firstName} {lastName} from {company}`. Same content as Slack notification.

No auto-reply to the submitter.

## Testing

- Worker unit tests via Vitest (Wrangler test framework) with mocked external APIs
- Manual end-to-end test on staging Worker URL before switching the form
- Test Turnstile in both pass and fail scenarios

## Rollout

1. Deploy Worker to `contact-form.nathananderson.workers.dev` (or custom route)
2. Update `contact.html` to replace Jotform iframe with new form
3. Test on live site
4. Remove Jotform embed code once confirmed working

## Rollback

Revert `contact.html` to restore Jotform iframe -- one git revert.

## Decisions

- **Single Worker** over Durable Objects or Pages Functions -- right complexity for a contact form
- **Worker in same repo** (`workers/contact-form/`) -- keeps everything together
- **Turnstile managed mode** over hCaptcha or honeypot-only -- native CF integration, low friction
- **CF Email Workers** over Resend/SendGrid -- no third-party dependency for email
- **No auto-reply** -- avoids deliverability issues, you respond personally
- **Vanilla JS** -- no framework, no build step for the frontend
