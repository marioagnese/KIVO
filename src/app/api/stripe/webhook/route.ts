import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  FieldValue,
} from "firebase-admin/firestore";

import Stripe from "stripe";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  stripe,
} from "@/lib/stripe";


export const runtime =
  "nodejs";


/* =========================================================
   STRIPE WEBHOOK
========================================================= */

/*
 * Stripe authenticates this request with its webhook
 * signature. Firebase authentication is intentionally
 * not used here.
 *
 * This webhook is the only authority that may mark
 * a KIVO booking as paid.
 */
export async function POST(
  request: NextRequest
) {
  const webhookSecret =
    process.env
      .STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(
      "STRIPE_WEBHOOK_SECRET is not configured."
    );

    return NextResponse.json(
      {
        error:
          "Stripe webhook is not configured.",
      },
      {
        status: 500,
      }
    );
  }

  const signature =
    request.headers.get(
      "stripe-signature"
    );

  if (!signature) {
    return NextResponse.json(
      {
        error:
          "Missing Stripe signature.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * Stripe signature verification requires
   * the exact raw request body.
   */
  const rawBody =
    await request.text();

  let event:
    Stripe.Event;

  try {
    event =
      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
  } catch (error) {
    console.error(
      "Stripe webhook signature verification failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Invalid Stripe webhook signature.",
      },
      {
        status: 400,
      }
    );
  }


  /* =========================================================
     PAYMENT CONFIRMATION
  ========================================================= */

  if (
    event.type ===
      "checkout.session.completed" ||
    event.type ===
      "checkout.session.async_payment_succeeded"
  ) {
    const session =
      event.data.object as
        Stripe.Checkout.Session;

    /*
     * Even with card-only Checkout,
     * paid status remains the final gate.
     */
    if (
      session.payment_status !==
      "paid"
    ) {
      return NextResponse.json({
        received: true,
      });
    }

    const bookingRequestId =
      String(
        session.metadata
          ?.bookingRequestId ??
          ""
      ).trim();

    const driverUid =
      String(
        session.metadata
          ?.driverUid ??
          ""
      ).trim();

    const hostUid =
      String(
        session.metadata
          ?.hostUid ??
          ""
      ).trim();

    const stripeHostAccountId =
      String(
        session.metadata
          ?.stripeHostAccountId ??
          ""
      ).trim();

    if (
      !bookingRequestId ||
      !driverUid ||
      !hostUid ||
      !stripeHostAccountId
    ) {
      console.error(
        "Paid Stripe session is missing KIVO metadata:",
        session.id
      );

      return NextResponse.json(
        {
          error:
            "Missing KIVO payment metadata.",
        },
        {
          status: 400,
        }
      );
    }

    const bookingRef =
      adminDb
        .collection(
          "bookingRequests"
        )
        .doc(
          bookingRequestId
        );

    try {
      const paymentIntentId =
        typeof session.payment_intent ===
          "string"
          ? session.payment_intent
          : session.payment_intent?.id ??
            null;

      if (!paymentIntentId) {
        throw new Error(
          "Paid KIVO Checkout Session does not have a PaymentIntent."
        );
      }

      /*
       * Resolve Stripe's successful Charge before entering
       * the Firestore transaction. Firestore transaction
       * callbacks may be retried, so external Stripe API
       * calls must stay outside that callback.
       */
      const paymentIntent =
        await stripe.paymentIntents.retrieve(
          paymentIntentId
        );

      const chargeId =
        typeof paymentIntent.latest_charge ===
          "string"
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge?.id ??
            null;

      if (!chargeId) {
        throw new Error(
          "Paid KIVO PaymentIntent does not have a successful Stripe Charge."
        );
      }

      await adminDb.runTransaction(
        async (
          transaction
        ) => {
          const bookingSnap =
            await transaction.get(
              bookingRef
            );

          if (
            !bookingSnap.exists
          ) {
            throw new Error(
              "KIVO booking does not exist."
            );
          }

          const booking =
            bookingSnap.data() ?? {};

          const stripePayment =
            booking.stripePayment &&
            typeof booking
              .stripePayment ===
              "object"
              ? booking
                  .stripePayment as Record<
                    string,
                    unknown
                  >
              : {};

          const storedSessionId =
            String(
              stripePayment
                .checkoutSessionId ??
                ""
            ).trim();

          const storedAmount =
            Number(
              stripePayment
                .amount
            );

          const storedCurrency =
            String(
              stripePayment
                .currency ??
                ""
            )
              .trim()
              .toLowerCase();

          const storedHostAccountId =
            String(
              stripePayment
                .hostAccountId ??
                ""
            ).trim();


          /*
           * Metadata alone is never enough.
           * Stripe must match the authoritative
           * KIVO booking snapshot.
           */
          if (
            storedSessionId !==
            session.id
          ) {
            throw new Error(
              "Stripe Checkout session does not match booking."
            );
          }

          if (
            String(
              booking.driverUid ??
              ""
            ) !==
            driverUid
          ) {
            throw new Error(
              "Stripe Driver does not match booking."
            );
          }

          if (
            String(
              booking.hostUid ??
              ""
            ) !==
            hostUid
          ) {
            throw new Error(
              "Stripe Host does not match booking."
            );
          }

          if (
            storedHostAccountId !==
            stripeHostAccountId
          ) {
            throw new Error(
              "Stripe Host account does not match booking."
            );
          }

          if (
            !Number.isFinite(
              storedAmount
            ) ||
            session.amount_total !==
              storedAmount
          ) {
            throw new Error(
              "Stripe payment amount does not match booking."
            );
          }

          const sessionCurrency =
            String(
              session.currency ??
              ""
            )
              .trim()
              .toLowerCase();

          if (
            !storedCurrency ||
            sessionCurrency !==
              storedCurrency
          ) {
            throw new Error(
              "Stripe payment currency does not match booking."
            );
          }


          /*
           * Stripe may deliver the same event more
           * than once. Already-paid is a safe no-op.
           */
          if (
            booking.paymentStatus ===
              "paid"
          ) {
            return;
          }

          if (
            booking.status !==
            "accepted"
          ) {
            throw new Error(
              "Only an accepted KIVO booking can be marked paid."
            );
          }

          if (
            booking.paymentStatus !==
            "required"
          ) {
            throw new Error(
              "KIVO booking is not awaiting payment."
            );
          }

          transaction.update(
            bookingRef,
            {
              paymentStatus:
                "paid",

              paymentPaidAt:
                FieldValue
                  .serverTimestamp(),

              "stripePayment.checkoutStatus":
                "paid",

              "stripePayment.paymentIntentId":
                paymentIntentId,

              "stripePayment.chargeId":
                chargeId,

              "stripePayment.stripeEventId":
                event.id,

              "stripePayment.updatedAt":
                FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );
    } catch (error) {
      console.error(
        "KIVO Stripe payment reconciliation failed:",
        {
          eventId:
            event.id,
          sessionId:
            session.id,
          bookingRequestId,
          error,
        }
      );

      return NextResponse.json(
        {
          error:
            "Stripe payment could not be reconciled.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "KIVO payment confirmed:",
      {
        eventId:
          event.id,
        checkoutSessionId:
          session.id,
        bookingRequestId,
      }
    );
  }


  return NextResponse.json({
    received: true,
  });
}
