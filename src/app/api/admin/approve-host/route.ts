import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { Resend } from "resend";

import {
  adminAuth,
  adminDb,
  verifyKivoAdminToken,
} from "@/lib/firebaseAdmin";

type ApproveHostBody = {
  uid: string;
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

    const body = (await request.json()) as ApproveHostBody;
    const uid = body.uid?.trim();

    if (!uid) {
      return NextResponse.json(
        { error: "Missing Host uid." },
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

    const email = String(onboarding.email ?? "")
      .trim()
      .toLowerCase();

    const name = String(onboarding.name ?? "Founding Host");
    const postalCode = String(onboarding.postalCode ?? "");

    if (!email) {
      return NextResponse.json(
        { error: "Host email is unavailable." },
        { status: 400 }
      );
    }

    if (
      onboarding.status !== "review_pending" &&
      onboarding.status !== "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "This Host setup is not currently eligible for approval.",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------------
    // FOUNDING SETUP APPROVAL + ACTIVATION READINESS
    //
    // Approval starts the private final activation phase.
    // It does NOT grant the operational Host role and does
    // NOT create or activate a public Host listing.
    // --------------------------------------------------------

    const activationRef =
      adminDb.collection("hostActivations").doc(uid);

    const activationSnapshot =
      await activationRef.get();

    const activationSeed = {
      uid,

      leadId:
        typeof onboarding.leadId === "string"
          ? onboarding.leadId
          : null,

      status: "activation_in_progress",

      gates: {
        safety: {
          status: "not_started",
        },

        propertyAccess: {
          status: "not_started",
        },

        charger: {
          status: "not_started",
        },

        legal: {
          status: "not_started",
        },

        listing: {
          status: "not_started",
        },
      },

      blockers: [],

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (onboarding.status !== "approved") {
      const batch = adminDb.batch();

      batch.set(
        onboardingRef,
        {
          status: "approved",
          approvedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      if (!activationSnapshot.exists) {
        batch.set(
          activationRef,
          activationSeed
        );
      }

      await batch.commit();
    } else if (!activationSnapshot.exists) {
      // Backfill Hosts approved before the activation layer existed.
      // Never overwrite an existing activation record.
      await activationRef.set(
        activationSeed
      );
    }

    // --------------------------------------------------------
    // APPROVAL EMAILS
    //
    // Approval remains valid if email delivery has a secondary
    // failure. We report the warning without rolling approval
    // back.
    // --------------------------------------------------------

    let emailSent = false;
    let emailWarning: string | null = null;

    const latestSnapshot = await onboardingRef.get();
    const latest = latestSnapshot.data();

    if (!latest?.approvalEmailSentAt) {
      try {
        if (!process.env.RESEND_API_KEY) {
          throw new Error("Email service is not configured.");
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL;

        if (!appUrl) {
          throw new Error("KIVO application URL is not configured.");
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

        const resend = new Resend(process.env.RESEND_API_KEY);

        const hostResult = await resend.emails.send({
          from:
            process.env.KIVO_EMAIL_FROM ||
            "KIVO <onboarding@resend.dev>",
          to: email,
          replyTo:
            process.env.KIVO_EMAIL_REPLY_TO ||
            process.env.KIVO_INTERNAL_EMAIL ||
            undefined,
          subject: "You’re approved — finalize your KIVO Host setup",
          html: `
            <div style="background:#f6f8fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
              <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:36px;">

                <div style="font-size:13px;font-weight:800;letter-spacing:0.18em;color:#047857;">
                  KIVO FOUNDING HOSTS
                </div>

                <h1 style="font-size:32px;line-height:1.1;margin:14px 0 18px;color:#020817;">
                  You’re approved, ${escapeHtml(name)}.
                </h1>

                <p style="font-size:18px;line-height:1.7;color:#475569;margin:0 0 20px;">
                  Your KIVO Founding Host setup has been reviewed and approved. Now it’s time to finalize your KIVO Host setup.
                </p>

                <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:16px;padding:20px;margin:26px 0;">
                  <strong style="display:block;font-size:17px;color:#065f46;margin-bottom:8px;">
                    Next: finalize your Host setup.
                  </strong>

                  <p style="font-size:16px;line-height:1.6;color:#475569;margin:0;">
                    Your charger is still private and cannot be booked yet. Complete the remaining setup steps before your KIVO Host account becomes active.
                  </p>
                </div>

                <p style="font-size:16px;line-height:1.7;color:#475569;margin:0 0 20px;">
                  We already have your charger, parking, photos and hosting preferences, so you won’t need to enter them again. Next, we’ll guide you through the remaining account, identity, safety, agreement, property and listing steps.
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

        if (hostResult.error) {
          throw new Error(hostResult.error.message);
        }

        if (process.env.KIVO_INTERNAL_EMAIL) {
          const adminResult = await resend.emails.send({
            from:
              process.env.KIVO_EMAIL_FROM ||
              "KIVO <onboarding@resend.dev>",
            to: process.env.KIVO_INTERNAL_EMAIL,
            replyTo: email,
            subject: `KIVO Founding setup approved — ${postalCode || "No ZIP"}`,
            html: `
              <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:680px;margin:0 auto;padding:24px;">

                <h1 style="font-size:28px;margin-bottom:8px;">
                  KIVO Founding Host setup approved
                </h1>

                <p style="color:#64748b;">
                  The Founding Host setup has been approved and final activation has started. The operational Host role has not been granted yet.
                </p>

                <table style="width:100%;border-collapse:collapse;margin-top:24px;">
                  ${row("Name", name)}
                  ${row("Email", email)}
                  ${row("ZIP / Postal", postalCode)}
                  ${row("UID", uid)}
                  ${row("Status", "approved")}
                </table>

                <p style="margin-top:24px;color:#475569;">
                  No public charger listing was created by this approval.
                </p>

              </div>
            `,
          });

          if (adminResult.error) {
            throw new Error(adminResult.error.message);
          }
        }

        await onboardingRef.set(
          {
            approvalEmailSentAt:
              FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        emailSent = true;
      } catch (emailError) {
        console.error(
          "KIVO Host approval email error:",
          emailError
        );

        emailWarning =
          emailError instanceof Error
            ? emailError.message
            : "Approval email could not be sent.";
      }
    }

    return NextResponse.json({
      ok: true,
      approved: true,
      emailSent,
      emailWarning,
    });
  } catch (error) {
    console.error("KIVO Host approval error:", error);

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Unable to approve Host."
            : error instanceof Error
              ? error.message
              : "Unable to approve Host.",
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
