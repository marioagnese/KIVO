import { NextResponse } from "next/server";
import { Resend } from "resend";

import { adminDb } from "@/lib/firebaseAdmin";

import { ensureFoundingHostReferralProgram } from "@/lib/hostReferrals";

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

function activeEmailHtml({
  name,
  referralUrl,
}: {
  name: string;
  referralUrl: string;
}) {
  return `
    <div style="background:#f6f8fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:36px;">

        <div style="font-size:13px;font-weight:800;letter-spacing:0.18em;color:#047857;">
          KIVO FOUNDING HOST REFERRALS
        </div>

        <h1 style="font-size:32px;line-height:1.1;margin:14px 0 18px;">
          Your KIVO referral benefit is ready, ${escapeHtml(name)}.
        </h1>

        <p style="font-size:18px;line-height:1.7;color:#475569;">
          As one of KIVO's first 200 Founding Hosts, you can now help build the network and share in the growth you create.
        </p>

        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:18px;padding:22px;margin:26px 0;">
          <strong style="display:block;font-size:20px;color:#065f46;">
            Earn 15% of KIVO's commission for life from every Host you directly refer.
          </strong>

          <p style="font-size:16px;line-height:1.6;color:#475569;margin:12px 0 0;">
            During the Founding Host cohort, you also earn a $20 referral credit when a directly referred Founding Host becomes fully active.
          </p>
        </div>

        <p style="font-size:16px;line-height:1.7;color:#475569;">
          Direct referrals only. No levels, teams, downlines, or recruitment chains.
        </p>

        <a href="${referralUrl}"
           style="display:inline-block;background:#34d399;color:#020817;text-decoration:none;font-size:17px;font-weight:800;padding:15px 24px;border-radius:999px;margin:12px 0 22px;">
          Open my referral page →
        </a>

        <p style="font-size:15px;line-height:1.6;color:#64748b;">
          Referral earnings accumulate in your KIVO referral balance. Automated referral payouts will be enabled before paid Driver sessions launch.
        </p>

        <p style="font-size:16px;line-height:1.7;color:#020817;margin-top:26px;font-weight:700;">
          KIVO<br />
          <span style="color:#64748b;font-weight:400;">Your Neighborhood Charger</span>
        </p>
      </div>
    </div>
  `;
}

function incompleteEmailHtml({
  name,
  continueUrl,
}: {
  name: string;
  continueUrl: string;
}) {
  return `
    <div style="background:#f6f8fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:36px;">

        <div style="font-size:13px;font-weight:800;letter-spacing:0.18em;color:#047857;">
          KIVO FOUNDING HOSTS
        </div>

        <h1 style="font-size:32px;line-height:1.1;margin:14px 0 18px;">
          Your Founding Host place is waiting, ${escapeHtml(name)}.
        </h1>

        <p style="font-size:18px;line-height:1.7;color:#475569;">
          You already raised your hand to become a KIVO Founding Host. Your information is saved, but your Host setup is not fully active yet.
        </p>

        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:18px;padding:22px;margin:26px 0;">
          <strong style="display:block;font-size:19px;color:#065f46;">
            We've added another benefit for the first 200 Founding Hosts.
          </strong>

          <p style="font-size:16px;line-height:1.65;color:#475569;margin:12px 0 0;">
            Once fully activated, eligible Founding Hosts unlock a personal KIVO referral link and can earn 15% of KIVO's commission for life from Hosts they directly refer.
          </p>

          <p style="font-size:16px;line-height:1.65;color:#475569;margin:12px 0 0;">
            During the Founding Host cohort, a directly referred Founding Host who becomes fully active also earns you a $20 referral credit.
          </p>
        </div>

        <p style="font-size:17px;line-height:1.7;color:#475569;">
          Your original Founding Host benefit remains unchanged:
          <strong>The first 200 approved Founding Hosts receive 0% KIVO commission for life.</strong>
        </p>

        <a href="${continueUrl}"
           style="display:inline-block;background:#34d399;color:#020817;text-decoration:none;font-size:17px;font-weight:800;padding:15px 24px;border-radius:999px;margin:12px 0 22px;">
          Continue my Host setup →
        </a>

        <p style="font-size:16px;line-height:1.7;color:#020817;margin-top:26px;font-weight:700;">
          KIVO<br />
          <span style="color:#64748b;font-weight:400;">Your Neighborhood Charger</span>
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

    const url = new URL(request.url);

    const dryRun = url.searchParams.get("dryRun") === "1";

    const force = url.searchParams.get("force") === "1";

    const [leadsSnapshot, onboardingSnapshot, activationsSnapshot] =
      await Promise.all([
        adminDb.collection("foundingHostLeads").get(),

        adminDb.collection("hostOnboarding").get(),

        adminDb.collection("hostActivations").get(),
      ]);

    const activationByUid = new Map(
      activationsSnapshot.docs.map((document) => [
        document.id,
        document.data(),
      ]),
    );

    const onboardingByEmail = new Map<
      string,
      {
        uid: string;
        data: Record<string, any>;
      }
    >();

    for (const document of onboardingSnapshot.docs) {
      const data = document.data();

      const email = String(data.email ?? "")
        .trim()
        .toLowerCase();

      if (!email) {
        continue;
      }

      onboardingByEmail.set(email, {
        uid: document.id,
        data,
      });
    }

    const leadsByEmail = new Map<
      string,
      Array<{
        id: string;
        data: Record<string, any>;
      }>
    >();

    for (const document of leadsSnapshot.docs) {
      const data = document.data();

      const email = String(data.email ?? "")
        .trim()
        .toLowerCase();

      if (!email) {
        continue;
      }

      const current = leadsByEmail.get(email) ?? [];

      current.push({
        id: document.id,
        data,
      });

      leadsByEmail.set(email, current);
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://www.kivocharge.com";

    const preview: Array<Record<string, unknown>> = [];

    let sent = 0;
    let skipped = 0;

    for (const [email, leadItems] of leadsByEmail.entries()) {
      /*
       * Skip obvious internal/test records.
       */
      if (
        email === "contact@taxaipro.com" ||
        leadItems.some((item) =>
          String(item.data.name ?? "")
            .trim()
            .toUpperCase()
            .startsWith("TEST"),
        )
      ) {
        skipped++;

        preview.push({
          email,
          action: "skip_test",
        });

        continue;
      }

      const onboarding = onboardingByEmail.get(email);

      /*
       * Prefer the lead actually bound to the Host
       * onboarding record; otherwise use the latest
       * lead record for that email.
       */
      const selectedLead =
        (onboarding?.data.leadId
          ? leadItems.find((item) => item.id === onboarding.data.leadId)
          : undefined) ??
        [...leadItems].sort((a, b) => {
          const aMs = a.data.createdAt?.toMillis?.() ?? 0;

          const bMs = b.data.createdAt?.toMillis?.() ?? 0;

          return bMs - aMs;
        })[0];

      if (!selectedLead) {
        continue;
      }

      if (selectedLead.data.referralLaunchEmailSentAt && !force) {
        skipped++;

        preview.push({
          email,
          action: "skip_already_sent",
        });

        continue;
      }

      const name = String(selectedLead.data.name ?? "Founding Host").trim();

      const uid = onboarding?.uid ?? "";

      const activation = uid ? activationByUid.get(uid) : undefined;

      const foundingNumber = Number(activation?.foundingHostNumber ?? 0);

      const activeFoundingHost = Boolean(
        uid &&
        activation?.status === "active" &&
        activation?.foundingHost === true &&
        Number.isInteger(foundingNumber) &&
        foundingNumber >= 1 &&
        foundingNumber <= 200,
      );

      let subject: string;

      let html: string;

      let kind: string;

      if (activeFoundingHost) {
        const program = await ensureFoundingHostReferralProgram(uid);

        const referralUrl = `${baseUrl}/host/referrals`;

        subject = "Your KIVO Founding Host referral benefit is ready";

        html = activeEmailHtml({
          name,
          referralUrl,
        });

        kind = "active_referral_partner";

        preview.push({
          email,
          name,
          uid,
          status: "active",
          foundingHostNumber: foundingNumber,
          referralCode: program.code,
          referralUrl: `${baseUrl}/r/${program.code}`,
          action: dryRun ? "would_send" : "send",
        });
      } else {
        const continueUrl = onboardingUrl(selectedLead.id, email);

        subject = "Finish your KIVO Founding Host setup — new referral benefit";

        html = incompleteEmailHtml({
          name,
          continueUrl,
        });

        kind = "activation_referral_incentive";

        preview.push({
          email,
          name,
          uid: uid || null,
          status:
            activation?.status ??
            onboarding?.data.status ??
            selectedLead.data.status ??
            "lead",
          action: dryRun ? "would_send" : "send",
          continueUrl,
        });
      }

      if (dryRun) {
        continue;
      }

      const result = await resend.emails.send({
        from:
          process.env.KIVO_EMAIL_FROM || "KIVO Hosts <onboarding@resend.dev>",

        to: email,

        replyTo:
          process.env.KIVO_EMAIL_REPLY_TO ||
          process.env.KIVO_INTERNAL_EMAIL ||
          undefined,

        subject,
        html,
      });

      if (result.error) {
        console.error(
          `Referral launch email failed for ${email}:`,
          result.error,
        );

        continue;
      }

      await adminDb.collection("foundingHostLeads").doc(selectedLead.id).set(
        {
          referralLaunchEmailSentAt: new Date(),

          referralLaunchEmailKind: kind,
        },
        { merge: true },
      );

      sent++;
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      force,
      uniqueEmails: leadsByEmail.size,
      sent,
      skipped,
      preview,
    });
  } catch (error) {
    console.error("KIVO referral launch email error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process referral launch email.",
      },
      { status: 500 },
    );
  }
}
