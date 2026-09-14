import { NextRequest, NextResponse } from "next/server";
import { verifyKivoAdminToken } from "@/lib/firebaseAdmin";
import Stripe from "stripe";

const ACCOUNT_IDS = [
  "acct_1UBG8KPANR8tGwp3",
  "acct_1UC0voPJB8LfYwt5",
  "acct_1UFaXPPRUM8ocWFH",
];

export async function GET(request: NextRequest) {
  try {
    const authHeader =
      request.headers.get("authorization") ?? "";

    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token =
      authHeader.slice("Bearer ".length);

    await verifyKivoAdminToken(token);

    const key =
      process.env.STRIPE_SECRET_KEY;

    if (!key) {
      return NextResponse.json(
        {
          error:
            "STRIPE_SECRET_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const mode =
      key.startsWith("sk_live_")
        ? "live"
        : key.startsWith("sk_test_")
        ? "test"
        : "unknown";

    const stripe =
      new Stripe(key);

    const accounts = [];

    for (const accountId of ACCOUNT_IDS) {
      try {
        const account =
          await stripe.v2.core.accounts.retrieve(
            accountId,
            {
              include: [
                "configuration.recipient",
                "requirements",
              ],
            }
          );

        accounts.push({
          accountId,
          retrieved: true,
          livemode:
            account.livemode,
          contactEmail:
            account.contact_email ?? "",
          displayName:
            account.display_name ?? "",
          kivoHostUid:
            account.metadata
              ?.kivoHostUid ?? "",
          appliedConfigurations:
            account.applied_configurations ??
            [],
          closed:
            account.closed ?? false,
        });
      } catch (error: any) {
        accounts.push({
          accountId,
          retrieved: false,
          error:
            error?.message ??
            String(error),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      stripeMode: mode,
      accounts,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ??
          "Audit failed",
      },
      { status: 500 }
    );
  }
}
