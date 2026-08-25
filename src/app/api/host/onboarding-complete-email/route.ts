import { NextResponse } from "next/server";
import { Resend } from "resend";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

type CompletionEmailBody = {
  leadId: string;
};

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing Host authorization." },
        { status: 401 }
      );
    }

    const idToken = authorization.slice("Bearer ".length).trim();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const uid = decodedToken.uid;
    const authenticatedEmail =
      decodedToken.email?.trim().toLowerCase();

    if (!authenticatedEmail) {
      return NextResponse.json(
        { error: "Authenticated email is unavailable." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as CompletionEmailBody;
    const leadId = body.leadId?.trim();

    if (!leadId) {
      return NextResponse.json(
        { error: "Missing Founding Host reference." },
        { status: 400 }
      );
    }

    const onboardingRef =
      adminDb.collection("hostOnboarding").doc(uid);

    const onboardingSnapshot = await onboardingRef.get();

    if (!onboardingSnapshot.exists) {
      return NextResponse.json(
        { error: "Host onboarding record was not found." },
        { status: 404 }
      );
    }

    const onboarding = onboardingSnapshot.data();

    if (!onboarding) {
      return NextResponse.json(
        { error: "Host onboarding record is unavailable." },
        { status: 404 }
      );
    }

    if (
      onboarding.uid !== uid ||
      onboarding.leadId !== leadId ||
      String(onboarding.email ?? "").toLowerCase() !== authenticatedEmail ||
      onboarding.status !== "review_pending"
    ) {
      return NextResponse.json(
        { error: "Host onboarding submission is not ready for notification." },
        { status: 403 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const name = String(onboarding.name ?? "Founding Host");
    const postalCode = String(onboarding.postalCode ?? "");
    const charger = onboarding.charger ?? {};
    const property = onboarding.property ?? {};
    const hosting = onboarding.hosting ?? {};
    const photos = onboarding.photos ?? {};

    const photoCount = Object.values(photos).filter(Boolean).length;

    const hostResult = await resend.emails.send({
      from:
        process.env.KIVO_EMAIL_FROM ||
        "KIVO <onboarding@resend.dev>",
      to: authenticatedEmail,
      replyTo:
        process.env.KIVO_EMAIL_REPLY_TO ||
        process.env.KIVO_INTERNAL_EMAIL ||
        undefined,
      subject: "Your KIVO Host setup is under review",
      html: `
        <div style="background:#f6f8fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:36px;">

            <div style="font-size:13px;font-weight:800;letter-spacing:0.18em;color:#047857;">
              KIVO FOUNDING HOSTS
            </div>

            <h1 style="font-size:32px;line-height:1.1;margin:14px 0 18px;color:#020817;">
              Your setup is under review, ${escapeHtml(name)}.
            </h1>

            <p style="font-size:18px;line-height:1.7;color:#475569;margin:0 0 20px;">
              We received your charger, parking access, photos and hosting preferences.
            </p>

            <p style="font-size:18px;line-height:1.7;color:#475569;margin:0 0 20px;">
              KIVO will review your setup before moving you to the remaining approval and safety-screening steps.
            </p>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin:26px 0;">
              <strong style="display:block;font-size:17px;color:#020817;margin-bottom:8px;">
                Nothing is public or bookable yet.
              </strong>

              <p style="font-size:16px;line-height:1.6;color:#64748b;margin:0;">
                Your charger will not become available to Drivers until KIVO review and the remaining approval steps are complete.
              </p>
            </div>

            <p style="font-size:16px;line-height:1.7;color:#475569;margin:0;">
              We’ll contact you when your setup has been reviewed.
            </p>

            <p style="font-size:16px;line-height:1.7;color:#020817;margin:26px 0 0;font-weight:700;">
              KIVO<br />
              <span style="color:#64748b;font-weight:400;">Your Neighborhood Charger</span>
            </p>

          </div>
        </div>
      `,
    });

    if (hostResult.error) {
      throw new Error(
        `Host completion email failed: ${hostResult.error.message}`
      );
    }

    if (process.env.KIVO_INTERNAL_EMAIL) {
      const adminResult = await resend.emails.send({
        from:
          process.env.KIVO_EMAIL_FROM ||
          "KIVO <onboarding@resend.dev>",
        to: process.env.KIVO_INTERNAL_EMAIL,
        replyTo: authenticatedEmail,
        subject: `Host onboarding ready for review — ${postalCode || "No ZIP"}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:720px;margin:0 auto;padding:24px;">

            <h1 style="font-size:28px;margin-bottom:8px;">
              Host onboarding ready for review
            </h1>

            <p style="color:#64748b;margin-top:0;">
              A Founding Host has completed onboarding and is now in review_pending status.
            </p>

            <table style="width:100%;border-collapse:collapse;margin-top:24px;">
              ${row("Name", name)}
              ${row("Email", authenticatedEmail)}
              ${row("ZIP / Postal", postalCode)}
              ${row("Lead ID", leadId)}
              ${row("Onboarding UID", uid)}
              ${row("Connector", String(charger.connector ?? ""))}
              ${row("Power", String(charger.power ?? ""))}
              ${row("Parking", String(property.setup ?? ""))}
              ${row("Gate / Access", String(property.gatedAccess ?? ""))}
              ${row(
                "Availability",
                Array.isArray(hosting.availability)
                  ? hosting.availability.join(", ")
                  : ""
              )}
              ${row(
                "Approval",
                String(hosting.approvalPreference ?? "")
              )}
              ${row("Photo count", String(photoCount))}
              ${row("Status", "review_pending")}
            </table>

            <p style="margin-top:24px;color:#475569;">
              Photos remain private in Firebase Storage and should be reviewed through the KIVO admin workflow.
            </p>

          </div>
        `,
      });

      if (adminResult.error) {
        throw new Error(
          `Admin completion email failed: ${adminResult.error.message}`
        );
      }
    }

    await onboardingRef.set(
      {
        completionEmailSentAt:
          new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("KIVO onboarding completion email error:", error);

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Unable to send onboarding confirmation."
            : error instanceof Error
              ? error.message
              : "Unable to send onboarding confirmation.",
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

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;width:190px;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#475569;">
        ${escapeHtml(value || "—")}
      </td>
    </tr>
  `;
}
