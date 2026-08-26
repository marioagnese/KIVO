import { NextResponse } from "next/server";
import { Resend } from "resend";

import {
  adminAuth,
  adminDb,
  verifyKivoAdminToken,
} from "@/lib/firebaseAdmin";

type ResendActivationBody = {
  uid: string;
};

export async function POST(request: Request) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing admin authorization." },
        { status: 401 }
      );
    }

    const idToken =
      authorization
        .slice("Bearer ".length)
        .trim();

    await verifyKivoAdminToken(idToken);

    const body =
      (await request.json()) as ResendActivationBody;

    const uid =
      body.uid?.trim();

    if (!uid) {
      return NextResponse.json(
        { error: "Missing Host uid." },
        { status: 400 }
      );
    }

    const onboardingSnapshot =
      await adminDb
        .collection("hostOnboarding")
        .doc(uid)
        .get();

    if (!onboardingSnapshot.exists) {
      return NextResponse.json(
        {
          error:
            "Host onboarding record was not found.",
        },
        { status: 404 }
      );
    }

    const onboarding =
      onboardingSnapshot.data();

    if (
      !onboarding ||
      onboarding.status !== "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "Only approved Founding Host setups can receive an activation link.",
        },
        { status: 409 }
      );
    }

    const email =
      String(onboarding.email ?? "")
        .trim()
        .toLowerCase();

    const name =
      String(
        onboarding.name ??
          "Founding Host"
      );

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Host email is unavailable.",
        },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Email service is not configured.",
        },
        { status: 500 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      return NextResponse.json(
        {
          error:
            "KIVO application URL is not configured.",
        },
        { status: 500 }
      );
    }

    const activationUrl =
      `${appUrl.replace(/\/$/, "")}/host/activation`;

    const activationLink =
      await adminAuth.generateSignInWithEmailLink(
        email,
        {
          url: activationUrl,
          handleCodeInApp: true,
        }
      );

    const resend =
      new Resend(
        process.env.RESEND_API_KEY
      );

    const result =
      await resend.emails.send({
        from:
          process.env.KIVO_EMAIL_FROM ||
          "KIVO <onboarding@resend.dev>",

        to: email,

        replyTo:
          process.env.KIVO_EMAIL_REPLY_TO ||
          process.env.KIVO_INTERNAL_EMAIL ||
          undefined,

        subject:
          "Finalize your KIVO Host setup",

        html: `
          <div style="background:#f6f8fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:36px;">

              <div style="font-size:13px;font-weight:800;letter-spacing:0.18em;color:#047857;">
                KIVO FOUNDING HOSTS
              </div>

              <h1 style="font-size:32px;line-height:1.1;margin:14px 0 18px;color:#020817;">
                Continue your Host setup, ${escapeHtml(name)}.
              </h1>

              <p style="font-size:18px;line-height:1.7;color:#475569;margin:0 0 20px;">
                Your Founding Host setup is already approved. Use the secure link below to continue the remaining steps needed before your charger can become active on KIVO.
              </p>

              <p style="font-size:16px;line-height:1.7;color:#475569;margin:0 0 20px;">
                We already have your charger, parking, photos and hosting preferences, so you won’t need to enter them again.
              </p>

              <div style="margin:30px 0;">
                <a
                  href="${activationLink}"
                  style="display:inline-block;background:#34d399;color:#020817;text-decoration:none;font-size:17px;font-weight:800;padding:15px 24px;border-radius:999px;"
                >
                  Finalize my Host setup →
                </a>
              </div>

              <p style="font-size:14px;line-height:1.6;color:#64748b;margin:0 0 20px;">
                This secure setup link is intended for ${escapeHtml(email)}.
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
        result.error.message
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "KIVO Host activation-link resend error:",
      error
    );

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV ===
          "production"
            ? "Unable to resend Host setup link."
            : error instanceof Error
              ? error.message
              : "Unable to resend Host setup link.",
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
