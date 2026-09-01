import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
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

    let stripeAccountId =
      String(
        profile.stripeConnect?.accountId ??
        ""
      ).trim();

    if (!stripeAccountId) {
      const account =
        await stripe.v2.core.accounts.create({
          contact_email:
            decoded.email ?? undefined,

          display_name:
            String(
              profile.publicAlias ??
              profile.displayName ??
              decoded.email ??
              "KIVO Host"
            ).trim(),

          dashboard: "express",

          identity: {
            country: "US",
          },

          configuration: {
            recipient: {
              capabilities: {
                stripe_balance: {
                  stripe_transfers: {
                    requested: true,
                  },
                },
              },
            },
          },

          defaults: {
            currency: "usd",

            responsibilities: {
              fees_collector:
                "application",

              losses_collector:
                "application",
            },
          },

          metadata: {
            kivoHostUid:
              decoded.uid,
          },
        });

      stripeAccountId =
        account.id;

      await profileRef.set(
        {
          ownerUid:
            decoded.uid,

          stripeConnect: {
            accountId:
              stripeAccountId,

            accountVersion:
              "v2",

            onboardingStatus:
              "started",

            createdAt:
              FieldValue.serverTimestamp(),

            updatedAt:
              FieldValue.serverTimestamp(),
          },

          updatedAt:
            FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    const appUrl =
      process.env
        .NEXT_PUBLIC_APP_URL
        ?.replace(/\/$/, "");

    if (!appUrl) {
      return NextResponse.json(
        {
          error:
            "KIVO application URL is not configured.",
        },
        { status: 500 }
      );
    }

    const accountLink =
      await stripe.v2.core.accountLinks.create({
        account:
          stripeAccountId,

        use_case: {
          type:
            "account_onboarding",

          account_onboarding: {
            configurations: [
              "recipient",
            ],

            collection_options: {
              fields:
                "eventually_due",

              future_requirements:
                "include",
            },

            refresh_url:
              `${appUrl}/host/profile?stripe=refresh`,

            return_url:
              `${appUrl}/host/profile?stripe=return`,
          },
        },
      });

    return NextResponse.json({
      ok: true,

      onboardingUrl:
        accountLink.url,
    });
  } catch (error) {
    console.error(
      "Stripe Connect onboarding failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to start Host payout setup.",
      },
      { status: 500 }
    );
  }
}
