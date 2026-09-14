import { loadEnvConfig } from "@next/env";
import Stripe from "stripe";

loadEnvConfig(process.cwd());

const key = process.env.STRIPE_SECRET_KEY;

if (!key) {
  throw new Error("STRIPE_SECRET_KEY is not configured.");
}

const stripe = new Stripe(key);

const accounts = stripe.v2?.core?.accounts;

if (!accounts) {
  throw new Error("stripe.v2.core.accounts is unavailable.");
}

console.log(
  "Stripe key mode:",
  key.startsWith("sk_live_") ? "LIVE" : "TEST"
);

console.log("");
console.log("stripe.v2.core.accounts methods:");

let proto: any = accounts;
const methods = new Set<string>();

while (proto && proto !== Object.prototype) {
  for (const name of Object.getOwnPropertyNames(proto)) {
    if (
      name !== "constructor" &&
      typeof (accounts as any)[name] === "function"
    ) {
      methods.add(name);
    }
  }

  proto = Object.getPrototypeOf(proto);
}

console.log([...methods].sort());
