import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  stripe,
  stripeConnectProfileKey,
  stripeMode,
} from "@/lib/stripe";

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

    const hasHostRole =
      roles.includes("host");

    let activationEligible =
      false;

    if (!hasHostRole) {
      const activationSnapshot =
        await adminDb
          .collection("hostActivations")
          .doc(decoded.uid)
          .get();

      const activation =
        activationSnapshot.data() ?? {};

      activationEligible =
        activationSnapshot.exists &&
        (
          activation.status ===
            "activation_in_progress" ||
          activation.status ===
            "approved"
        );
    }

    if (
      !hasHostRole &&
      !activationEligible
    ) {
      return NextResponse.json(
        {
          error:
            "KIVO Host activation access required.",
        },
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

    const selectedStripeConnect =
      profile[
        stripeConnectProfileKey
      ] &&
      typeof profile[
        stripeConnectProfileKey
      ] === "object"
        ? profile[
            stripeConnectProfileKey
          ]
        : null;

    const legacyTestStripeConnect =
      stripeMode === "test" &&
      profile.stripeConnect &&
      typeof profile.stripeConnect ===
        "object"
        ? profile.stripeConnect
        : null;

    const stripeAccountId =
      String(
        selectedStripeConnect
          ?.accountId ??
        legacyTestStripeConnect
          ?.accountId ??
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
        [stripeConnectProfileKey]: {
          accountId:
            stripeAccountId,

          accountVersion:
            "v2",

          mode:
            stripeMode,

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

    /*
     * Stripe is the authority for payout readiness.
     * Client code can never mark this gate complete.
     */
    if (payoutsReady) {
      await adminDb
        .collection("hostActivations")
        .doc(decoded.uid)
        .set(
          {
            gates: {
              payouts: {
                status: "complete",

                completedAt:
                  FieldValue.serverTimestamp(),

                source:
                  "stripe_connect",
              },
            },

            payoutReadiness: {
              status: "ready",

              mode:
                stripeMode,

              verifiedAt:
                FieldValue.serverTimestamp(),
            },

            updatedAt:
              FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }

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
