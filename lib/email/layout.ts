import { getEmailBrandName } from "@/lib/email/brand";
import { getAppUrl } from "@/lib/env/app-url";
import { SITE_EMAILS } from "@/lib/site/contact";

export function wrapEmailHtml(body: string): string {
  const appUrl = getAppUrl();
  const brand = getEmailBrandName();
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brand}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;background:#0f172a;color:#ffffff;">
              <a href="${appUrl}" style="color:#ffffff;text-decoration:none;font-size:18px;font-weight:700;">${brand}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px;border-top:1px solid #f1f5f9;font-size:12px;line-height:1.5;color:#64748b;">
              <p style="margin:0 0 8px;">Questions? Email <a href="mailto:${SITE_EMAILS.support}" style="color:#2563eb;">${SITE_EMAILS.support}</a></p>
              <p style="margin:0;">© ${year} ${brand}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailButton(href: string, label: string): string {
  return `<p style="margin:24px 0 8px;">
    <a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">${label}</a>
  </p>`;
}

export function emailHeading(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#0f172a;">${text}</h1>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#334155;">${text}</p>`;
}
