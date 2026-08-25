import { NextResponse } from "next/server";
import { Resend } from "resend";

import {
  adminAuth,
  verifyKivoAdminToken,
} from "@/lib/firebaseAdmin";

type HostInvitationBody = {
  leadId: string;
  name: string;
  email: string;
};

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing admin authorization." },
        { status: 401 }
      );
    }

    const idToken = authorization.slice("Bearer ".length).trim();

    await verifyKivoAdminToken(idToken);

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      return NextResponse.json(
        { error: "KIVO application URL is not configured." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as HostInvitationBody;

    const leadId = body.leadId?.trim();
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!leadId || !name || !email) {
      return NextResponse.json(
        { error: "Missing invitation information." },
        { status: 400 }
      );
    }

    const continueUrl =
      `${appUrl.replace(/\/$/, "")}/host/onboarding` +
      `?lead=${encodeURIComponent(leadId)}`;

    const signInLink = await adminAuth.generateSignInWithEmailLink(
      email,
      {
        url: continueUrl,
        handleCodeInApp: true,
      }
    );

    const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from:
        process.env.KIVO_EMAIL_FROM ||
        "KIVO <onboarding@resend.dev>",
      to: email,
      replyTo:
        process.env.KIVO_EMAIL_REPLY_TO ||
        process.env.KIVO_INTERNAL_EMAIL ||
        undefined,
      subject: "Complete your KIVO Founding Host setup",
      html: `
        <div style="background:#f6f8fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:36px;">

            <div style="font-size:13px;font-weight:800;letter-spacing:0.18em;color:#047857;">
              KIVO FOUNDING HOSTS
            </div>

            <h1 style="font-size:32px;line-height:1.1;margin:14px 0 18px;color:#020817;">
              You’re invited to continue, ${escapeHtml(name)}.
            </h1>

            <p style="font-size:18px;line-height:1.7;color:#475569;margin:0 0 20px;">
              We reviewed your Founding Host interest and would like you to complete the next step.
            </p>

            <p style="font-size:18px;line-height:1.7;color:#475569;margin:0 0 24px;">
              The setup is short and focuses only on your charger, parking access, a few photos and your hosting preferences.
            </p>

            <div style="margin:30px 0;">
              <a
                href="${signInLink}"
                style="display:inline-block;background:#34d399;color:#020817;text-decoration:none;font-size:17px;font-weight:800;padding:15px 24px;border-radius:999px;"
              >
                Complete my Host setup
              </a>
            </div>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin:26px 0;">
              <strong style="display:block;font-size:17px;color:#020817;margin-bottom:8px;">
                You stay in control.
              </strong>

              <p style="font-size:16px;line-height:1.6;color:#64748b;margin:0;">
                Completing setup does not make your charger public or bookable. KIVO will review your information before any Host or charger is activated.
              </p>
            </div>

            <p style="font-size:16px;line-height:1.7;color:#475569;margin:0;">
              This secure link is intended for the email address used in your Founding Host application.
            </p>

            <p style="font-size:16px;line-height:1.7;color:#020817;margin:26px 0 0;font-weight:700;">
              KIVO<br />
              <span style="color:#64748b;font-weight:400;">Your Neighborhood Charger</span>
            </p>

          </div>
        </div>
      `,
    });

    if (result.error) {
      throw new Error(
        `Host invitation email failed: ${result.error.message}`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("KIVO Host invitation error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown invitation error.";

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Unable to send Host invitation."
            : message,
      },
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
