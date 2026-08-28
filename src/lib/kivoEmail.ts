import { Resend } from "resend";

type KivoEmailOptions = {
  to: string;
  subject: string;
  eyebrow?: string;
  title: string;
  body: string;
  buttonLabel?: string;
  buttonUrl?: string;
  accent?: "driver" | "host" | "neutral";
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendKivoEmail({
  to,
  subject,
  eyebrow = "KIVO",
  title,
  body,
  buttonLabel,
  buttonUrl,
  accent = "neutral",
}: KivoEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured."
    );
  }

  const accentColor =
    accent === "driver"
      ? "#0891b2"
      : accent === "host"
        ? "#047857"
        : "#334155";

  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from:
      process.env.KIVO_EMAIL_FROM ||
      "KIVO <onboarding@resend.dev>",

    to: to.trim().toLowerCase(),

    replyTo:
      process.env.KIVO_EMAIL_REPLY_TO ||
      process.env.KIVO_INTERNAL_EMAIL ||
      undefined,

    subject,

    html: `
      <div style="
        background:#f6f8fb;
        padding:32px 16px;
        font-family:Arial,Helvetica,sans-serif;
        color:#0f172a;
      ">
        <div style="
          max-width:640px;
          margin:0 auto;
          background:#ffffff;
          border:1px solid #e2e8f0;
          border-radius:24px;
          padding:36px;
        ">

          <div style="
            font-size:13px;
            font-weight:800;
            letter-spacing:0.18em;
            color:${accentColor};
          ">
            ${escapeHtml(eyebrow)}
          </div>

          <h1 style="
            font-size:32px;
            line-height:1.1;
            margin:14px 0 18px;
            color:#020817;
          ">
            ${escapeHtml(title)}
          </h1>

          <div style="
            font-size:17px;
            line-height:1.7;
            color:#475569;
          ">
            ${body}
          </div>

          ${
            buttonLabel && buttonUrl
              ? `
                <div style="margin:30px 0 8px;">
                  <a
                    href="${escapeHtml(buttonUrl)}"
                    style="
                      display:inline-block;
                      background:${accentColor};
                      color:#ffffff;
                      text-decoration:none;
                      font-size:16px;
                      font-weight:800;
                      padding:14px 22px;
                      border-radius:12px;
                    "
                  >
                    ${escapeHtml(buttonLabel)}
                  </a>
                </div>
              `
              : ""
          }

          <p style="
            font-size:16px;
            line-height:1.7;
            color:#020817;
            margin:30px 0 0;
            font-weight:700;
          ">
            KIVO<br />
            <span style="
              color:#64748b;
              font-weight:400;
            ">
              Your Neighborhood Charger
            </span>
          </p>

        </div>
      </div>
    `,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}

export function kivoParagraph(text: string) {
  return `
    <p style="margin:0 0 18px;">
      ${escapeHtml(text)}
    </p>
  `;
}
