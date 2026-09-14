import { loadEnvConfig } from "@next/env";
import Stripe from "stripe";

loadEnvConfig(process.cwd());

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  if (!key.startsWith("sk_test_")) {
    throw new Error(
      "Safety stop: this script is only for the TEST Stripe account."
    );
  }

  const stripe = new Stripe(key);

  const accountId =
    "acct_1UAth2A1LiKXUksm";

  console.log(
    `Closing TEST Stripe Connect account: ${accountId}`
  );

  const account =
    await stripe.v2.core.accounts.retrieve(
      accountId
    );

  console.log(
    `Contact email: ${account.contact_email ?? ""}`
  );

  console.log(
    `KIVO Host UID: ${account.metadata?.kivoHostUid ?? ""}`
  );

  const result =
    await stripe.v2.core.accounts.close(
      accountId,
      {
        applied_configurations: [
          "recipient",
        ],
      }
    );

  console.log("");
  console.log("Stripe close result:");
  console.log(
    JSON.stringify(result, null, 2)
  );

  console.log("");
  console.log(
    "TEST Stripe Connect account closed."
  );
}

main().catch((error) => {
  console.error(
    "Stripe account close failed:",
    error
  );

  process.exit(1);
});
