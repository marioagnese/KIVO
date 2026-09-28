import { NextResponse } from "next/server";
import { Resend } from "resend";

import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const PRE_ONBOARDING_48H = 48 * HOUR;
const PRE_ONBOARDING_10D = 10 * DAY;

const STAGE_REMINDER_3D = 3 * DAY;
const STAGE_REMINDER_7D = 7 * DAY;

/*
 * Prevent the normal lifecycle cron from immediately
 * following a one-time campaign such as today's referral launch.
 */
const RECENT_TOUCH_SUPPRESSION = 72 * HOUR;

type AnyRecord = Record<string, any>;

type Candidate = {
  leadId: string;
  leadRef: FirebaseFirestore.DocumentReference;
  lead: AnyRecord;
  email: string;
  name: string;
  onboardingId: string | null;
  onboarding: AnyRecord | null;
  uid: string | null;
  activation: AnyRecord | null;
  stage:
    | "lead"
    | "onboarding"
    | "activation_in_progress"
    | "ready_for_final_approval"
    | "active";
  stageRank: number;
  stageStartedAtMs: number | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function baseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://www.kivocharge.com";
}

function onboardingUrl(leadId: string, email: string) {
  return (
    `${baseUrl()}/host/onboarding/start` +
    `?lead=${encodeURIComponent(leadId)}` +
    `&email=${encodeURIComponent(email)}`
  );
}

function activationUrl() {
  return `${baseUrl()}/host/activation`;
}

function timestampMs(value: any): number | null {
  if (!value) return null;

  if (typeof value?.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value?.toDate === "function") {
    return value.toDate().getTime();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function latestTimestampMs(...values: any[]): number | null {
  const valid = values
    .map(timestampMs)
    .filter((value): value is number => typeof value === "number");

  if (!valid.length) return null;

  return Math.max(...valid);
}

function recentLifecycleTouchMs(lead: AnyRecord): number | null {
  return latestTimestampMs(
    lead.referralLaunchEmailSentAt,
    lead.signupReminder48hSentAt,
    lead.signupReminder10dSentAt,
    lead.onboardingReminder3dSentAt,
    lead.onboardingReminder7dSentAt,
    lead.activationReminder3dSentAt,
    lead.activationReminder7dSentAt,
  );
}

function lifecycleHtml({
  name,
  stage,
  url,
  reminder,
}: {
  name: string;
  stage: "lead" | "onboarding" | "activation";
  url: string;
  reminder: "first" | "final";
}) {
  const first = reminder === "first";

  const title =
    stage === "activation"
      ? first
        ? `Finish activating your KIVO Host account, ${escapeHtml(name)}.`
        : "Your KIVO Host activation is still waiting."
      : stage === "onboarding"
        ? first
          ? `Continue your KIVO Host setup, ${escapeHtml(name)}.`
          : "Your KIVO Founding Host setup is still open."
        : first
          ? `Finish your KIVO Host setup, ${escapeHtml(name)}.`
          : "Your KIVO Founding Host setup is still open.";

  const body =
    stage === "activation"
      ? "You completed the first part of becoming a KIVO Host. Your activation is not finished yet."
      : stage === "onboarding"
        ? "You already started your KIVO Host setup. Your information is saved and you can continue where you left off."
        : first
          ? "You started becoming a KIVO Founding Host, but your Host setup has not been completed yet."
          : "If you’re still interested in becoming a KIVO Founding Host, your setup is waiting for you.";

  const button =
    stage === "activation"
      ? first
        ? "Continue my activation →"
        : "Finish my activation →"
      : first
        ? "Continue my Host setup →"
        : "Finish my Host setup →";

  return `
    <div style="background:#f6f8fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:36px;">

        <div style="font-size:13px;font-weight:800;letter-spacing:0.18em;color:#047857;">
          KIVO FOUNDING HOSTS
        </div>

        <h1 style="font-size:30px;line-height:1.15;margin:14px 0 18px;color:#020817;">
          ${title}
        </h1>

        <p style="font-size:18px;line-height:1.7;color:#475569;margin:0 0 20px;">
          ${body}
        </p>

        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:16px;padding:20px;margin:24px 0;">
          <strong style="display:block;font-size:17px;color:#065f46;">
            The first 200 approved Founding Hosts receive 0% KIVO commission for life.
          </strong>

          <p style="font-size:15px;line-height:1.6;color:#475569;margin:12px 0 0;">
            Once fully activated, eligible Hosts in the first 200 also unlock a personal referral link:
            15% of KIVO's commission for life from direct Host referrals, plus a $20 activation credit
            for each direct Founding Host referral who becomes fully active during the Founding cohort.
          </p>
        </div>

        <a
          href="${url}"
          style="display:inline-block;background:#34d399;color:#020817;text-decoration:none;font-size:17px;font-weight:800;padding:15px 24px;border-radius:999px;"
        >
          ${button}
        </a>

        <p style="font-size:15px;line-height:1.6;color:#64748b;margin:26px 0 0;">
          Nothing is public or bookable until KIVO review and activation are complete.
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

function candidateAgeMs(candidate: Candidate, now: number) {
  const start =
    candidate.stageStartedAtMs ?? timestampMs(candidate.lead.createdAt);

  if (!start) return null;

  return now - start;
}

function chooseBetterCandidate(
  existing: Candidate | undefined,
  incoming: Candidate,
) {
  if (!existing) return incoming;

  if (incoming.stageRank > existing.stageRank) {
    return incoming;
  }

  if (incoming.stageRank < existing.stageRank) {
    return existing;
  }

  const existingTime =
    existing.stageStartedAtMs ?? timestampMs(existing.lead.createdAt) ?? 0;

  const incomingTime =
    incoming.stageStartedAtMs ?? timestampMs(incoming.lead.createdAt) ?? 0;

  return incomingTime >= existingTime ? incoming : existing;
}

async function buildCandidate(
  document: FirebaseFirestore.QueryDocumentSnapshot,
): Promise<Candidate | null> {
  const lead = document.data();

  const email = String(lead.email ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return null;
  }

  const name = String(lead.name ?? "Founding Host").trim();

  const onboardingSnapshot = await adminDb
    .collection("hostOnboarding")
    .where("leadId", "==", document.id)
    .limit(1)
    .get();

  const onboardingDoc = onboardingSnapshot.empty
    ? null
    : onboardingSnapshot.docs[0];

  const onboarding = onboardingDoc?.data() ?? null;

  const uid =
    String(onboarding?.uid ?? onboarding?.userId ?? lead.uid ?? "").trim() ||
    null;

  let activation: AnyRecord | null = null;

  if (uid) {
    const activationSnapshot = await adminDb
      .collection("hostActivations")
      .doc(uid)
      .get();

    if (activationSnapshot.exists) {
      activation = activationSnapshot.data() ?? null;
    }
  }

  const activationStatus = String(
    activation?.status ?? onboarding?.activationStatus ?? "",
  ).trim();

  let stage: Candidate["stage"];
  let stageRank: number;

  if (activationStatus === "active") {
    stage = "active";
    stageRank = 5;
  } else if (activationStatus === "ready_for_final_approval") {
    stage = "ready_for_final_approval";
    stageRank = 4;
  } else if (
    activationStatus === "activation_in_progress" ||
    activationStatus === "approved"
  ) {
    stage = "activation_in_progress";
    stageRank = 3;
  } else if (
    onboardingDoc ||
    lead.onboardingStartedAt ||
    lead.status === "onboarding"
  ) {
    stage = "onboarding";
    stageRank = 2;
  } else {
    stage = "lead";
    stageRank = 1;
  }

  const stageStartedAtMs =
    stage === "activation_in_progress"
      ? latestTimestampMs(
          activation?.updatedAt,
          activation?.createdAt,
          onboarding?.updatedAt,
          onboarding?.completedAt,
          lead.onboardingStartedAt,
          lead.createdAt,
        )
      : stage === "ready_for_final_approval"
        ? latestTimestampMs(
            activation?.updatedAt,
            activation?.readyForFinalApprovalAt,
            activation?.createdAt,
            lead.createdAt,
          )
        : stage === "onboarding"
          ? latestTimestampMs(
              onboarding?.updatedAt,
              onboarding?.createdAt,
              lead.onboardingStartedAt,
              lead.createdAt,
            )
          : stage === "active"
            ? latestTimestampMs(
                activation?.activatedAt,
                activation?.updatedAt,
                lead.createdAt,
              )
            : timestampMs(lead.createdAt);

  return {
    leadId: document.id,
    leadRef: document.ref,
    lead,
    email,
    name,
    onboardingId: onboardingDoc?.id ?? null,
    onboarding,
    uid,
    activation,
    stage,
    stageRank,
    stageStartedAtMs,
  };
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

    const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

    const resend = new Resend(process.env.RESEND_API_KEY);

    const now = Date.now();

    const leadSnapshot = await adminDb.collection("foundingHostLeads").get();

    /*
     * Deduplicate by email and keep the candidate
     * furthest along in the Host lifecycle.
     */
    const candidatesByEmail = new Map<string, Candidate>();

    for (const document of leadSnapshot.docs) {
      const candidate = await buildCandidate(document);

      if (!candidate) continue;

      const isTestAccount =
        candidate.email === "contact@taxaipro.com" ||
        candidate.name.trim().toUpperCase().startsWith("TEST");

      if (isTestAccount) {
        continue;
      }

      const existing = candidatesByEmail.get(candidate.email);

      candidatesByEmail.set(
        candidate.email,
        chooseBetterCandidate(existing, candidate),
      );
    }

    let lead48hDue = 0;
    let lead10dDue = 0;

    let onboarding3dDue = 0;
    let onboarding7dDue = 0;

    let activation3dDue = 0;
    let activation7dDue = 0;

    let sent = 0;

    let skippedRecentTouch = 0;
    let skippedTooEarly = 0;
    let skippedReadyForApproval = 0;
    let skippedActive = 0;

    const preview: Array<Record<string, unknown>> = [];

    for (const candidate of candidatesByEmail.values()) {
      const { lead, leadRef, email, name, leadId, stage } = candidate;

      /*
       * Never send signup/activation reminders
       * to a fully active Host.
       */
      if (stage === "active") {
        skippedActive++;

        preview.push({
          email,
          status: stage,
          action: "skip_active",
        });

        continue;
      }

      /*
       * The Host has completed their work.
       * At this point KIVO/admin owns the next action.
       */
      if (stage === "ready_for_final_approval") {
        skippedReadyForApproval++;

        preview.push({
          email,
          status: stage,
          action: "skip_waiting_for_kivo",
        });

        continue;
      }

      /*
       * Avoid hammering someone immediately
       * after another KIVO lifecycle campaign.
       */
      const recentTouch = recentLifecycleTouchMs(lead);

      if (recentTouch && now - recentTouch < RECENT_TOUCH_SUPPRESSION) {
        skippedRecentTouch++;

        preview.push({
          email,
          status: stage,
          action: "skip_recent_touch",
        });

        continue;
      }

      const age = candidateAgeMs(candidate, now);

      if (age === null) {
        skippedTooEarly++;
        continue;
      }

      let subject = "";
      let html = "";
      let markerField = "";
      let kind = "";
      let url = "";

      /*
       * -----------------------
       * LEAD — DID NOT START
       * -----------------------
       */
      if (stage === "lead") {
        url = onboardingUrl(leadId, email);

        if (age >= PRE_ONBOARDING_10D && !lead.signupReminder10dSentAt) {
          lead10dDue++;
          kind = "lead_10d";

          subject = "Your KIVO Founding Host setup is still open";

          html = lifecycleHtml({
            name,
            stage: "lead",
            url,
            reminder: "final",
          });

          markerField = "signupReminder10dSentAt";
        } else if (age >= PRE_ONBOARDING_48H && !lead.signupReminder48hSentAt) {
          lead48hDue++;
          kind = "lead_48h";

          subject = "Finish your KIVO Founding Host setup";

          html = lifecycleHtml({
            name,
            stage: "lead",
            url,
            reminder: "first",
          });

          markerField = "signupReminder48hSentAt";
        }
      }

      /*
       * -----------------------
       * ONBOARDING STALLED
       * -----------------------
       */
      if (stage === "onboarding") {
        url = onboardingUrl(leadId, email);

        if (age >= STAGE_REMINDER_7D && !lead.onboardingReminder7dSentAt) {
          onboarding7dDue++;
          kind = "onboarding_7d";

          subject = "Your KIVO Host setup is still waiting";

          html = lifecycleHtml({
            name,
            stage: "onboarding",
            url,
            reminder: "final",
          });

          markerField = "onboardingReminder7dSentAt";
        } else if (
          age >= STAGE_REMINDER_3D &&
          !lead.onboardingReminder3dSentAt
        ) {
          onboarding3dDue++;
          kind = "onboarding_3d";

          subject = "Continue your KIVO Host setup";

          html = lifecycleHtml({
            name,
            stage: "onboarding",
            url,
            reminder: "first",
          });

          markerField = "onboardingReminder3dSentAt";
        }
      }

      /*
       * -----------------------
       * ACTIVATION STALLED
       * -----------------------
       */
      if (stage === "activation_in_progress") {
        url = activationUrl();

        if (age >= STAGE_REMINDER_7D && !lead.activationReminder7dSentAt) {
          activation7dDue++;
          kind = "activation_7d";

          subject = "Your KIVO Host activation is still waiting";

          html = lifecycleHtml({
            name,
            stage: "activation",
            url,
            reminder: "final",
          });

          markerField = "activationReminder7dSentAt";
        } else if (
          age >= STAGE_REMINDER_3D &&
          !lead.activationReminder3dSentAt
        ) {
          activation3dDue++;
          kind = "activation_3d";

          subject = "Finish activating your KIVO Host account";

          html = lifecycleHtml({
            name,
            stage: "activation",
            url,
            reminder: "first",
          });

          markerField = "activationReminder3dSentAt";
        }
      }

      if (!subject || !html || !markerField) {
        skippedTooEarly++;

        preview.push({
          email,
          status: stage,
          action: "skip_not_due",
        });

        continue;
      }

      preview.push({
        email,
        name,
        uid: candidate.uid,
        status: stage,
        reminder: kind,
        url,
        action: dryRun ? "would_send" : "send",
      });

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
          `KIVO lifecycle reminder failed for ${email}:`,
          result.error,
        );

        continue;
      }

      await leadRef.set(
        {
          [markerField]: new Date(),

          lastLifecycleReminderAt: new Date(),

          lastLifecycleReminderKind: kind,
        },
        { merge: true },
      );

      sent++;
    }

    return NextResponse.json({
      ok: true,
      dryRun,

      uniqueEmails: candidatesByEmail.size,

      due: {
        lead48h: lead48hDue,
        lead10d: lead10dDue,

        onboarding3d: onboarding3dDue,
        onboarding7d: onboarding7dDue,

        activation3d: activation3dDue,
        activation7d: activation7dDue,
      },

      sent,

      skipped: {
        recentTouch: skippedRecentTouch,

        tooEarly: skippedTooEarly,

        readyForFinalApproval: skippedReadyForApproval,

        active: skippedActive,
      },

      preview,
    });
  } catch (error) {
    console.error("KIVO Host lifecycle reminder cron error:", error);

    return NextResponse.json(
      {
        error: "Unable to process Host lifecycle reminders.",
      },
      { status: 500 },
    );
  }
}
