import { NextResponse } from "next/server";
import { Resend } from "resend";

import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function onboardingUrl(leadId: string, email: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.kivocharge.com";

  return (
    `${baseUrl}/host/onboarding/start` +
    `?lead=${encodeURIComponent(leadId)}` +
    `&email=${encodeURIComponent(email)}`
  );
}

function reminderHtml({
  name,
  url,
  reminder,
}: {
  name: string;
  url: string;
  reminder: "48h" | "10d";
}) {
  const firstReminder = reminder === "48h";

  return `
    <div style="background:#f6f8fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:36px;">

        <div style="font-size:13px;font-weight:800;letter-spacing:0.18em;color:#047857;">
          KIVO FOUNDING HOSTS
        </div>

        <h1 style="font-size:30px;line-height:1.15;margin:14px 0 18px;color:#020817;">
          ${
            firstReminder
              ? `Finish your KIVO Host setup, ${escapeHtml(name)}.`
              : "Your KIVO Founding Host setup is still open."
          }
        </h1>

        <p style="font-size:18px;line-height:1.7;color:#475569;margin:0 0 20px;">
          ${
            firstReminder
              ? "You started becoming a KIVO Founding Host, but your Host setup has not been completed yet."
              : "If you’re still interested in becoming a KIVO Founding Host, your setup is waiting for you."
          }
        </p>

        <p style="font-size:18px;line-height:1.7;color:#475569;margin:0 0 24px;">
          Your information is saved. Continue your setup to complete
          your charger and hosting details.
        </p>

        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:16px;padding:20px;margin:24px 0;">
          <strong style="display:block;font-size:17px;color:#065f46;">
            The first 200 approved Founding Hosts receive
            0% KIVO commission for life.
          </strong>
        </div>

        <a
          href="${url}"
          style="display:inline-block;background:#34d399;color:#020817;text-decoration:none;font-size:17px;font-weight:800;padding:15px 24px;border-radius:999px;"
        >
          ${
            firstReminder
              ? "Continue my Host setup →"
              : "Finish my Host setup →"
          }
        </a>

        <p style="font-size:15px;line-height:1.6;color:#64748b;margin:26px 0 0;">
          Nothing is public or bookable until KIVO review and
          activation are complete.
        </p>

        <p style="font-size:16px;line-height:1.7;color:#020817;margin:26px 0 0;font-weight:700;">
          KIVO<br />
          <span style="color:#64748b;font-weight:400;">
            Your Neighborhood Charger
          </span>
        </p>

      </div>
    </div>
  `;
}

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (
      !process.env.CRON_SECRET ||
      authorization !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          error: "Email service is not configured.",
        },
        { status: 500 },
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const now = Date.now();

    const fortyEightHours = 48 * 60 * 60 * 1000;

    const tenDays = 10 * 24 * 60 * 60 * 1000;

    const snapshot = await adminDb.collection("foundingHostLeads").get();

    let reminder48hSent = 0;
    let reminder10dSent = 0;
    let skippedStarted = 0;
    let skippedTooEarly = 0;

    for (const document of snapshot.docs) {
      const lead = document.data();

      const email = String(lead.email ?? "")
        .trim()
        .toLowerCase();

      const name = String(lead.name ?? "Founding Host").trim();

      if (!email) {
        continue;
      }

      if (lead.onboardingStartedAt || lead.status === "onboarding") {
        skippedStarted++;
        continue;
      }

      const createdAt = lead.createdAt?.toDate?.();

      if (!createdAt) {
        continue;
      }

      const age = now - createdAt.getTime();

      const url = onboardingUrl(document.id, email);

      // Check Day 10 first so an old lead
      // never receives both reminders at once.
      if (age >= tenDays && !lead.signupReminder10dSentAt) {
        const result = await resend.emails.send({
          from:
            process.env.KIVO_EMAIL_FROM || "KIVO Hosts <onboarding@resend.dev>",

          to: email,

          replyTo:
            process.env.KIVO_EMAIL_REPLY_TO ||
            process.env.KIVO_INTERNAL_EMAIL ||
            undefined,

          subject: "Your KIVO Founding Host setup is still open",

          html: reminderHtml({
            name,
            url,
            reminder: "10d",
          }),
        });

        if (result.error) {
          console.error(
            `10-day Host reminder failed for ${document.id}:`,
            result.error,
          );
          continue;
        }

        await document.ref.set(
          {
            signupReminder10dSentAt: new Date(),
          },
          { merge: true },
        );

        reminder10dSent++;
        continue;
      }

      if (
        age >= fortyEightHours &&
        age < tenDays &&
        !lead.signupReminder48hSentAt
      ) {
        const result = await resend.emails.send({
          from:
            process.env.KIVO_EMAIL_FROM || "KIVO Hosts <onboarding@resend.dev>",

          to: email,

          replyTo:
            process.env.KIVO_EMAIL_REPLY_TO ||
            process.env.KIVO_INTERNAL_EMAIL ||
            undefined,

          subject: "Finish your KIVO Founding Host setup",

          html: reminderHtml({
            name,
            url,
            reminder: "48h",
          }),
        });

        if (result.error) {
          console.error(
            `48-hour Host reminder failed for ${document.id}:`,
            result.error,
          );
          continue;
        }

        await document.ref.set(
          {
            signupReminder48hSentAt: new Date(),
          },
          { merge: true },
        );

        reminder48hSent++;
        continue;
      }

      skippedTooEarly++;
    }

    return NextResponse.json({
      ok: true,
      reminder48hSent,
      reminder10dSent,
      skippedStarted,
      skippedTooEarly,
    });
  } catch (error) {
    console.error("KIVO Host reminder cron error:", error);

    return NextResponse.json(
      {
        error: "Unable to process Host signup reminders.",
      },
      { status: 500 },
    );
  }
}
