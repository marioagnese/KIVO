import { createHash } from "crypto";

import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebaseAdmin";

export const FOUNDING_REFERRAL_SHARE_RATE = 0.15;
export const FOUNDING_REFERRAL_ACTIVATION_BONUS_CENTS = 2000;
export const FOUNDING_REFERRAL_PAYOUT_THRESHOLD_CENTS = 2500;

type ReferralProgram = {
  code: string;
  foundingHostNumber: number;
  referralShareRate: number;
  activationBonusCents: number;
  payoutThresholdCents: number;
};

function buildReferralCode(uid: string, foundingHostNumber: number) {
  const suffix = createHash("sha256")
    .update(uid)
    .digest("hex")
    .slice(0, 6)
    .toUpperCase();

  return `FH${foundingHostNumber}-${suffix}`;
}

function validFoundingNumber(value: unknown) {
  const number = Number(value);

  return Number.isInteger(number) && number >= 1 && number <= 200;
}

export async function ensureFoundingHostReferralProgram(
  uid: string,
): Promise<ReferralProgram> {
  const activationRef = adminDb.collection("hostActivations").doc(uid);

  const profileRef = adminDb.collection("hostProfiles").doc(uid);

  const [activationSnapshot, profileSnapshot] = await Promise.all([
    activationRef.get(),
    profileRef.get(),
  ]);

  if (!activationSnapshot.exists) {
    throw new Error("Host activation record not found.");
  }

  const activation = activationSnapshot.data() ?? {};
  const profile = profileSnapshot.data() ?? {};

  if (
    activation.status !== "active" ||
    activation.foundingHost !== true ||
    !validFoundingNumber(activation.foundingHostNumber)
  ) {
    throw new Error(
      "Referral Partner access is reserved for active Founding Hosts in the first 200.",
    );
  }

  const foundingHostNumber = Number(activation.foundingHostNumber);

  const existingCode =
    typeof profile.referralProgram?.code === "string" &&
    profile.referralProgram.code.trim()
      ? profile.referralProgram.code.trim().toUpperCase()
      : "";

  const code = existingCode || buildReferralCode(uid, foundingHostNumber);

  const program: ReferralProgram = {
    code,
    foundingHostNumber,
    referralShareRate: FOUNDING_REFERRAL_SHARE_RATE,
    activationBonusCents: FOUNDING_REFERRAL_ACTIVATION_BONUS_CENTS,
    payoutThresholdCents: FOUNDING_REFERRAL_PAYOUT_THRESHOLD_CENTS,
  };

  const codeRef = adminDb.collection("referralCodes").doc(code);

  await Promise.all([
    profileRef.set(
      {
        referralProgram: {
          eligible: true,
          enabled: true,

          code,

          foundingHostNumber,

          rewardType: "share_of_kivo_commission",

          referralShareRate: FOUNDING_REFERRAL_SHARE_RATE,

          activationBonusCents: FOUNDING_REFERRAL_ACTIVATION_BONUS_CENTS,

          payoutThresholdCents: FOUNDING_REFERRAL_PAYOUT_THRESHOLD_CENTS,

          lifetime: true,
          directOnly: true,

          updatedAt: FieldValue.serverTimestamp(),

          createdAt:
            profile.referralProgram?.createdAt ?? FieldValue.serverTimestamp(),
        },

        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),

    codeRef.set(
      {
        code,
        referrerUid: uid,

        foundingHostNumber,

        referralShareRate: FOUNDING_REFERRAL_SHARE_RATE,

        activationBonusCents: FOUNDING_REFERRAL_ACTIVATION_BONUS_CENTS,

        lifetime: true,
        directOnly: true,
        active: true,

        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
  ]);

  return program;
}

/*
 * Called AFTER KIVO performs final Host activation.
 *
 * Responsibilities:
 *
 * 1. If the newly activated Host is one of the first
 *    200 Founding Hosts, unlock their own referral program.
 *
 * 2. If this Host originally came through another
 *    Founding Host's referral URL, permanently bind the
 *    direct referral relationship.
 *
 * 3. Create the one-time $20 Founding Host activation
 *    credit exactly once.
 *
 * No Stripe transfers occur here.
 */
export async function finalizeFoundingHostReferralActivation(
  referredHostUid: string,
) {
  const activationRef = adminDb
    .collection("hostActivations")
    .doc(referredHostUid);

  const onboardingRef = adminDb
    .collection("hostOnboarding")
    .doc(referredHostUid);

  const [activationSnapshot, onboardingSnapshot] = await Promise.all([
    activationRef.get(),
    onboardingRef.get(),
  ]);

  if (!activationSnapshot.exists || !onboardingSnapshot.exists) {
    return;
  }

  const activation = activationSnapshot.data() ?? {};

  const onboarding = onboardingSnapshot.data() ?? {};

  if (activation.status !== "active") {
    return;
  }

  /*
   * Every activated member of the first-200 cohort
   * gets their own Referral Partner code.
   */
  if (
    activation.foundingHost === true &&
    validFoundingNumber(activation.foundingHostNumber)
  ) {
    await ensureFoundingHostReferralProgram(referredHostUid);
  }

  const leadId =
    typeof activation.leadId === "string" && activation.leadId.trim()
      ? activation.leadId.trim()
      : typeof onboarding.leadId === "string" && onboarding.leadId.trim()
        ? onboarding.leadId.trim()
        : "";

  if (!leadId) {
    return;
  }

  const leadSnapshot = await adminDb
    .collection("foundingHostLeads")
    .doc(leadId)
    .get();

  if (!leadSnapshot.exists) {
    return;
  }

  const lead = leadSnapshot.data() ?? {};

  const attribution =
    lead.attribution && typeof lead.attribution === "object"
      ? lead.attribution
      : {};

  const utmSource = String(attribution.utmSource ?? "")
    .trim()
    .toLowerCase();

  const utmCampaign = String(attribution.utmCampaign ?? "")
    .trim()
    .toLowerCase();

  const referralCode = String(attribution.utmContent ?? "")
    .trim()
    .toUpperCase();

  if (
    utmSource !== "founding_host" ||
    utmCampaign !== "founding_host_referral" ||
    !referralCode
  ) {
    return;
  }

  const codeSnapshot = await adminDb
    .collection("referralCodes")
    .doc(referralCode)
    .get();

  if (!codeSnapshot.exists) {
    return;
  }

  const codeData = codeSnapshot.data() ?? {};

  if (codeData.active !== true) {
    return;
  }

  const referrerUid = String(codeData.referrerUid ?? "").trim();

  if (!referrerUid || referrerUid === referredHostUid) {
    return;
  }

  const referrerActivationSnapshot = await adminDb
    .collection("hostActivations")
    .doc(referrerUid)
    .get();

  const referrerActivation = referrerActivationSnapshot.data() ?? {};

  if (
    !referrerActivationSnapshot.exists ||
    referrerActivation.status !== "active" ||
    referrerActivation.foundingHost !== true ||
    !validFoundingNumber(referrerActivation.foundingHostNumber)
  ) {
    return;
  }

  const referredFoundingHost =
    activation.foundingHost === true &&
    validFoundingNumber(activation.foundingHostNumber);

  const activationBonusCents = referredFoundingHost
    ? FOUNDING_REFERRAL_ACTIVATION_BONUS_CENTS
    : 0;

  /*
   * One referral relationship per referred Host.
   * Document ID = referred Host UID, so attribution
   * cannot later be overwritten by another referrer.
   */
  const referralRef = adminDb.collection("referrals").doc(referredHostUid);

  const bonusRef = adminDb
    .collection("referralEarnings")
    .doc(`activation_${referredHostUid}`);

  await adminDb.runTransaction(async (transaction) => {
    const [referralSnapshot, bonusSnapshot] = await Promise.all([
      transaction.get(referralRef),
      transaction.get(bonusRef),
    ]);

    /*
     * First valid referrer wins forever.
     */
    if (referralSnapshot.exists) {
      return;
    }

    transaction.set(referralRef, {
      referrerUid,
      referredHostUid,

      referralCode,

      referredLeadId: leadId,

      status: "active",

      directOnly: true,
      lifetime: true,

      commissionShareRate: FOUNDING_REFERRAL_SHARE_RATE,

      referredFoundingHost,

      referredFoundingHostNumber: referredFoundingHost
        ? Number(activation.foundingHostNumber)
        : null,

      activationBonusCents,

      capturedAt: lead.createdAt ?? FieldValue.serverTimestamp(),

      activatedAt: FieldValue.serverTimestamp(),

      createdAt: FieldValue.serverTimestamp(),

      updatedAt: FieldValue.serverTimestamp(),
    });

    if (activationBonusCents > 0 && !bonusSnapshot.exists) {
      transaction.set(bonusRef, {
        type: "founding_host_activation_bonus",

        referrerUid,
        referredHostUid,

        referralCode,

        amountCents: activationBonusCents,

        currency: "usd",

        status: "accrued",

        payoutThresholdCents: FOUNDING_REFERRAL_PAYOUT_THRESHOLD_CENTS,

        createdAt: FieldValue.serverTimestamp(),
      });
    }
  });
}
