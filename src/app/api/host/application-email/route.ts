import { NextResponse } from "next/server";
import { Resend } from "resend";

type ApplicationEmailBody = {
  name: string;
  phone: string;
  email: string;
  postalCode: string;
  parkingSetup: string;
  chargerStatus: string;
};

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const body = (await request.json()) as ApplicationEmailBody;

    const {
      name,
      phone,
      email,
      postalCode,
      parkingSetup,
      chargerStatus,
    } = body;

    if (
      !name?.trim() ||
      !phone?.trim() ||
      !email?.trim() ||
      !postalCode?.trim() ||
      !parkingSetup?.trim() ||
      !chargerStatus?.trim()
    ) {
      return NextResponse.json(
        { error: "Missing required application information." },
        { status: 400 }
      );
    }

    const applicantEmail = email.trim().toLowerCase();

    const applicantResult = await resend.emails.send({
      from:
        process.env.KIVO_EMAIL_FROM ||
        "KIVO Hosts <onboarding@resend.dev>",
      to: applicantEmail,
      replyTo:
        process.env.KIVO_EMAIL_REPLY_TO ||
        process.env.KIVO_INTERNAL_EMAIL ||
        undefined,
      subject: "You’re on the KIVO Founding Host list",
      html: `
        <div style="background:#f6f8fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:36px;">
            
            <div style="font-size:13px;font-weight:800;letter-spacing:0.18em;color:#047857;">
              KIVO FOUNDING HOSTS
            </div>

            <h1 style="font-size:32px;line-height:1.1;margin:14px 0 18px;color:#020817;">
              Thanks for raising your hand, ${escapeHtml(name.trim())}.
            </h1>

            <p style="font-size:18px;line-height:1.7;color:#475569;margin:0 0 20px;">
              We received your Founding Host application.
            </p>

            <p style="font-size:18px;line-height:1.7;color:#475569;margin:0 0 20px;">
              We’ll review your location and charger status. If your area is a good fit for the early KIVO network, we’ll contact you with the next step.
            </p>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin:26px 0;">
              <strong style="display:block;font-size:17px;color:#020817;margin-bottom:8px;">
                No commitment yet.
              </strong>

              <p style="font-size:16px;line-height:1.6;color:#64748b;margin:0;">
                Nothing has been listed publicly, your charger is not bookable, and applying does not commit you to hosting.
              </p>
            </div>

            <p style="font-size:16px;line-height:1.7;color:#475569;margin:0;">
              Thanks for helping us build a more personal and useful EV charging network.
            </p>

            <p style="font-size:16px;line-height:1.7;color:#020817;margin:26px 0 0;font-weight:700;">
              KIVO<br />
              <span style="color:#64748b;font-weight:400;">Your Neighborhood Charger</span>
            </p>

          </div>
        </div>
      `,
    });

    if (applicantResult.error) {
      throw new Error(
        `Applicant email failed: ${applicantResult.error.message}`
      );
    }

    if (process.env.KIVO_INTERNAL_EMAIL) {
      const internalResult = await resend.emails.send({
        from:
          process.env.KIVO_EMAIL_FROM ||
          "KIVO Hosts <onboarding@resend.dev>",
        to: process.env.KIVO_INTERNAL_EMAIL,
        replyTo: applicantEmail,
        subject: `New Founding Host — ${postalCode.trim().toUpperCase()}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:680px;margin:0 auto;padding:24px;">
            <h1 style="font-size:28px;margin-bottom:8px;">
              New Founding Host application
            </h1>

            <p style="color:#64748b;margin-top:0;">
              A new lead was submitted through the KIVO Host acquisition page.
            </p>

            <table style="width:100%;border-collapse:collapse;margin-top:24px;">
              ${row("Name", name.trim())}
              ${row("Email", applicantEmail)}
              ${row("Phone", phone.trim())}
              ${row("ZIP / Postal", postalCode.trim().toUpperCase())}
              ${row("Parking setup", parkingSetup.trim())}
              ${row("Charger status", chargerStatus.trim())}
              ${row("Source", "kivo-host-acquisition-page")}
            </table>

            <p style="margin-top:24px;color:#475569;">
              Reply to this email to contact the applicant directly.
            </p>
          </div>
        `,
      });

      if (internalResult.error) {
        throw new Error(
          `Internal email failed: ${internalResult.error.message}`
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("KIVO application email error:", error);

    return NextResponse.json(
      { error: "Unable to send application email." },
      { status: 500 }
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;width:180px;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#475569;">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
}
