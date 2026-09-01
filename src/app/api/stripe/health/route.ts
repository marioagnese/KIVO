import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    const account =
      await stripe.accounts.retrieve(null);

    return NextResponse.json({
      ok: true,
      stripeAccountId: account.id,
      country: account.country,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  } catch (error) {
    console.error(
      "Stripe health check failed:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Unable to connect to Stripe.",
      },
      { status: 500 }
    );
  }
}
