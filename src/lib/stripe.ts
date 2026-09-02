import Stripe from "stripe";

const stripeSecretKey =
  process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error(
    "STRIPE_SECRET_KEY is not configured."
  );
}

export const stripeMode:
  "test" | "live" =
  stripeSecretKey.startsWith(
    "sk_live_"
  )
    ? "live"
    : "test";

export const stripeConnectProfileKey =
  stripeMode === "live"
    ? "stripeConnectLive"
    : "stripeConnectTest";

export const stripe =
  new Stripe(stripeSecretKey);
