import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

import {
  ensureFoundingHostReferralProgram,
  FOUNDING_REFERRAL_ACTIVATION_BONUS_CENTS,
  FOUNDING_REFERRAL_PAYOUT_THRESHOLD_CENTS,
  FOUNDING_REFERRAL_SHARE_RATE,
} from "@/lib/hostReferrals";

export const dynamic = "force-dynamic";

function moneyTotal(docs: Array<Record<string, unknown>>) {
  return docs.reduce((sum, item) => {
    const amount = Number(item.amountCents ?? 0);

    return sum + (Number.isInteger(amount) && amount > 0 ? amount : 0);
  }, 0);
}

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "KIVO Host authentication required.",
        },
        { status: 401 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(
      authorization.slice("Bearer ".length).trim(),
    );

    const activationSnapshot = await adminDb
      .collection("hostActivations")
      .doc(decoded.uid)
      .get();

    if (!activationSnapshot.exists) {
      return NextResponse.json({
        ok: true,
        eligible: false,
        unlocked: false,
        reason: "host_activation_not_found",
      });
    }

    const activation = activationSnapshot.data() ?? {};

    const foundingHostNumber = Number(activation.foundingHostNumber ?? 0);

    const eligible =
      activation.foundingHost === true &&
      Number.isInteger(foundingHostNumber) &&
      foundingHostNumber >= 1 &&
      foundingHostNumber <= 200;

    if (!eligible) {
      return NextResponse.json({
        ok: true,
        eligible: false,
        unlocked: false,
        reason: "not_in_first_200_founding_hosts",
      });
    }

    if (activation.status !== "active") {
      return NextResponse.json({
        ok: true,
        eligible: true,
        unlocked: false,

        foundingHostNumber,

        referralShareRate: FOUNDING_REFERRAL_SHARE_RATE,

        activationBonusCents: FOUNDING_REFERRAL_ACTIVATION_BONUS_CENTS,

        payoutThresholdCents: FOUNDING_REFERRAL_PAYOUT_THRESHOLD_CENTS,

        activationStatus: String(activation.status ?? "not_active"),
      });
    }

    const program = await ensureFoundingHostReferralProgram(decoded.uid);

    const [referralsSnapshot, earningsSnapshot] = await Promise.all([
      adminDb
        .collection("referrals")
        .where("referrerUid", "==", decoded.uid)
        .get(),

      adminDb
        .collection("referralEarnings")
        .where("referrerUid", "==", decoded.uid)
        .get(),
    ]);

    const referrals: Array<Record<string, unknown> & { id: string }> =
      referralsSnapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

    const earnings: Array<Record<string, unknown> & { id: string }> =
      earningsSnapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

    const activationCredits = earnings.filter(
      (item) => item.type === "founding_host_activation_bonus",
    );

    const commissionEarnings = earnings.filter(
      (item) => item.type === "commission_share",
    );

    const accruedEarnings = earnings.filter(
      (item) => item.status === "accrued" || item.status === "payable",
    );

    const totalAccruedCents = moneyTotal(
      accruedEarnings as Array<Record<string, unknown>>,
    );

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://www.kivocharge.com";

    return NextResponse.json({
      ok: true,
      eligible: true,
      unlocked: true,

      foundingHostNumber: program.foundingHostNumber,

      code: program.code,

      referralUrl: `${baseUrl}/r/${encodeURIComponent(program.code)}`,

      referralShareRate: program.referralShareRate,

      activationBonusCents: program.activationBonusCents,

      payoutThresholdCents: program.payoutThresholdCents,

      stats: {
        referredHosts: referrals.length,

        activeReferrals: referrals.filter((item) => item.status === "active")
          .length,

        activationCreditsCents: moneyTotal(
          activationCredits as Array<Record<string, unknown>>,
        ),

        commissionEarningsCents: moneyTotal(
          commissionEarnings as Array<Record<string, unknown>>,
        ),

        accruedEarningsCents: totalAccruedCents,

        thresholdReached: totalAccruedCents >= program.payoutThresholdCents,
      },
    });
  } catch (error) {
    console.error("KIVO referral dashboard error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load KIVO referrals.",
      },
      { status: 500 },
    );
  }
}
