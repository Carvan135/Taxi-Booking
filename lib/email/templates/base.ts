import { SITE_EMAILS } from "@/lib/site/contact";

const NAVY = "#1E3A5F";
const TEXT = "#1F2937";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatMoney(amount: number): string {
  return `£${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatServiceType(serviceType: string): string {
  const labels: Record<string, string> = {
    standard: "Standard",
    executive: "Executive",
    van: "Van",
    suv: "SUV",
  };
  return labels[serviceType] ?? serviceType;
}

export function formatDateDisplay(date: string, time: string): string {
  return `${date} at ${time}`;
}

export function maskPhoneLastFour(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "Not provided";
  return `•••• ${digits.slice(-4)}`;
}

export function wrapEmailTemplate(content: string, previewText: string): string {
  const preview = escapeHtml(previewText);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>AirportHub</title>
  <!--[if mso]><style type="text/css">body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preview}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid ${BORDER};">
          <tr>
            <td style="padding:20px 32px;background:${NAVY};">
              <span style="font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:0.02em;">AirportHub</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F9FAFB;border-top:1px solid ${BORDER};font-size:12px;line-height:1.6;color:${MUTED};text-align:center;">
              AirportHub &nbsp;|&nbsp;
              <a href="mailto:${SITE_EMAILS.support}" style="color:${MUTED};text-decoration:underline;">${SITE_EMAILS.support}</a>
              &nbsp;|&nbsp;
              <a href="https://airporthub.co.uk" style="color:${MUTED};text-decoration:underline;">airporthub.co.uk</a>
              <br />
              <span style="color:#9CA3AF;">© ${year} AirportHub</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailHeading(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;font-weight:700;color:${NAVY};">${escapeHtml(text)}</h1>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT};">${text}</p>`;
}

export function referenceBadge(reference: string): string {
  return `<p style="margin:0 0 20px;font-size:24px;font-weight:700;color:${NAVY};letter-spacing:0.04em;">${escapeHtml(reference)}</p>`;
}

export function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
    <tr>
      <td style="border-radius:8px;background:${NAVY};">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function detailTable(
  rows: { label: string; value: string }[],
): string {
  const items = rows
    .map(
      (row) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:13px;color:${MUTED};width:38%;vertical-align:top;">${escapeHtml(row.label)}</td>
      <td style="padding:10px 0 10px 12px;border-bottom:1px solid ${BORDER};font-size:14px;font-weight:500;color:${TEXT};vertical-align:top;">${row.value}</td>
    </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">${items}</table>`;
}

export function stepsList(steps: string[]): string {
  const items = steps
    .map(
      (step, i) => `
    <tr>
      <td style="padding:0 12px 12px 0;vertical-align:top;width:28px;">
        <span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:50%;background:${NAVY};color:#FFFFFF;font-size:12px;font-weight:700;">${i + 1}</span>
      </td>
      <td style="padding:0 0 12px;font-size:14px;line-height:1.5;color:${TEXT};vertical-align:top;">${escapeHtml(step)}</td>
    </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${items}</table>`;
}

export function sectionLabel(text: string): string {
  return `<p style="margin:20px 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${MUTED};">${escapeHtml(text)}</p>`;
}

export function priceHighlight(label: string, amount: number): string {
  return `<p style="margin:16px 0 0;font-size:15px;color:${TEXT};"><span style="color:${MUTED};">${escapeHtml(label)}</span> <strong style="font-size:18px;color:${NAVY};">${formatMoney(amount)}</strong></p>`;
}
