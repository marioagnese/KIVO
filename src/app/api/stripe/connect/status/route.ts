import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

import { stripe } from "@/lib/stripe";

export async function GET(request: Request) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error:
            "KIVO Host authentication required.",
        },
        { status: 401 }
      );
    }

    const decoded =
      await adminAuth.verifyIdToken(
        authorization
          .slice("Bearer ".length)
          .trim()
      );

    const userSnapshot =
      await adminDb
        .collection("users")
        .doc(decoded.uid)
        .get();

    if (!userSnapshot.exists) {
      return NextResponse.json(
        { error: "KIVO account not found." },
        { status: 404 }
      );
    }

    const userData =
      userSnapshot.data() ?? {};

    const roles =
      Array.isArray(userData.roles)
        ? userData.roles
        : [];

    if (!roles.includes("host")) {
      return NextResponse.json(
        { error: "KIVO Host access required." },
        { status: 403 }
      );
    }

    const profileRef =
      adminDb
        .collection("hostProfiles")
        .doc(decoded.uid);

    const profileSnapshot =
      await profileRef.get();

    const profile =
      profileSnapshot.data() ?? {};

    const stripeAccountId =
      String(
        profile.stripeConnect?.accountId ??
        ""
      ).trim();

    if (!stripeAccountId) {
      return NextResponse.json({
        ok: true,
        status: "not_started",
        payoutsReady: false,
        transfersStatus: null,
        requirementsDue: 0,
      });
    }

    const account =
      await stripe.v2.core.accounts.retrieve(
        stripeAccountId,
        {
          include: [
            "configuration.recipient",
            "requirements",
            "future_requirements",
          ],
        }
      );

    const recipient =
      account.configuration?.recipient;

    const transfers =
      recipient?.capabilities
        ?.stripe_balance
        ?.stripe_transfers;

    const transfersStatus =
      transfers?.status ?? null;

    const requirementsDue =
      account.requirements?.entries?.length ??
      0;

    const payoutsReady =
      recipient?.applied === true &&
      transfersStatus === "active" &&
      requirementsDue === 0;

    const status =
      payoutsReady
        ? "ready"
        : "incomplete";

    await profileRef.set(
      {
        stripeConnect: {
          accountId:
            stripeAccountId,

          accountVersion:
            "v2",

          onboardingStatus:
            status,

          transfersStatus:
            transfersStatus,

          payoutsReady:
            payoutsReady,

          requirementsDue:
            requirementsDue,

          livemode:
            account.livemode,

          updatedAt:
            FieldValue.serverTimestamp(),
        },

        updatedAt:
          FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      status,
      payoutsReady,
      transfersStatus,
      requirementsDue,
      livemode:
        account.livemode,
    });
  } catch (error) {
    console.error(
      "Stripe Connect status check failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to check Host payout status.",
      },
      { status: 500 }
    );
  }
}
