import { NextResponse } from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  stripe,
  stripeConnectProfileKey,
  stripeMode,
} from "@/lib/stripe";


export async function POST(
  request: Request
) {
  try {
    /*
     * Driver authentication
     */
    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization?.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          error:
            "KIVO Driver authentication required.",
        },
        { status: 401 }
      );
    }

    const decoded =
      await adminAuth.verifyIdToken(
        authorization
          .slice(
            "Bearer ".length
          )
          .trim()
      );

    /*
     * Booking request
     */
    const body =
      await request.json();

    const bookingRequestId =
      String(
        body.bookingRequestId ??
        ""
      ).trim();

    if (!bookingRequestId) {
      return NextResponse.json(
        {
          error:
            "Booking request ID is required.",
        },
        { status: 400 }
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

    const bookingSnapshot =
      await bookingRef.get();

    if (
      !bookingSnapshot.exists
    ) {
      return NextResponse.json(
        {
          error:
            "Booking request not found.",
        },
        { status: 404 }
      );
    }

    const booking =
      bookingSnapshot.data() ??
      {};

    /*
     * The signed-in Driver must own
     * this booking.
     */
    if (
      booking.driverUid !==
      decoded.uid
    ) {
      return NextResponse.json(
        {
          error:
            "This charging session belongs to another Driver.",
        },
        { status: 403 }
      );
    }

    /*
     * Payment is available only after
     * Host acceptance.
     */
    if (
      booking.status !==
      "accepted"
    ) {
      return NextResponse.json(
        {
          error:
            "This charging session is not ready for payment.",
        },
        { status: 409 }
      );
    }

    if (
      booking.paymentStatus ===
      "paid"
    ) {
      return NextResponse.json(
        {
          error:
            "This charging session has already been paid.",
        },
        { status: 409 }
      );
    }

    if (
      booking.paymentStatus !==
      "required"
    ) {
      return NextResponse.json(
        {
          error:
            "Payment is not currently required for this charging session.",
        },
        { status: 409 }
      );
    }

    /*
     * The booking snapshot is the
     * authoritative payment amount.
     *
     * Never accept an amount from
     * the Driver browser.
     */
    const price =
      Number(
        booking.price
      );

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "This booking does not have a valid session price.",
        },
        { status: 409 }
      );
    }

    const amount =
      Math.round(
        price * 100
      );

    if (
      amount < 50
    ) {
      return NextResponse.json(
        {
          error:
            "This booking amount is too small to process.",
        },
        { status: 409 }
      );
    }

    const currency =
      String(
        booking.currency ??
        "USD"
      )
        .trim()
        .toLowerCase();

    if (
      currency !== "usd"
    ) {
      return NextResponse.json(
        {
          error:
            "KIVO sandbox payments currently support USD only.",
        },
        { status: 409 }
      );
    }

    /*
     * Host must already have completed
     * Stripe recipient onboarding.
     *
     * We do not transfer funds yet.
     * This validates that the future
     * payout destination exists and is
     * ready before collecting Driver money.
     */
    const hostUid =
      String(
        booking.hostUid ??
        ""
      ).trim();

    if (!hostUid) {
      return NextResponse.json(
        {
          error:
            "This booking does not have a valid KIVO Host.",
        },
        { status: 409 }
      );
    }

    const hostProfileSnapshot =
      await adminDb
        .collection(
          "hostProfiles"
        )
        .doc(
          hostUid
        )
        .get();

    const hostProfile =
      hostProfileSnapshot.data() ??
      {};

    const selectedStripeConnect =
      hostProfile[
        stripeConnectProfileKey
      ] &&
      typeof hostProfile[
        stripeConnectProfileKey
      ] === "object"
        ? hostProfile[
            stripeConnectProfileKey
          ] as Record<
            string,
            unknown
          >
        : null;

    const legacyTestStripeConnect =
      stripeMode === "test" &&
      hostProfile.stripeConnect &&
      typeof hostProfile.stripeConnect ===
        "object"
        ? hostProfile.stripeConnect as Record<
            string,
            unknown
          >
        : null;

    const stripeConnect =
      selectedStripeConnect ??
      legacyTestStripeConnect;

    const stripeAccountId =
      String(
        stripeConnect?.accountId ??
        ""
      ).trim();

    const payoutsReady =
      stripeConnect?.payoutsReady ===
      true;

    /*
     * Snapshot KIVO marketplace economics when Checkout
     * is created. Never recalculate an already-paid
     * booking using a future commission policy.
     *
     * IMPORTANT:
     * leadId is provenance only.
     *
     * Pricing authority comes from the durable
     * commissionEntitlement stored on hostActivations.
     */
    const activationSnapshot =
      await adminDb
        .collection("hostActivations")
        .doc(hostUid)
        .get();

    const activation =
      activationSnapshot.data() ?? {};

    const entitlement =
      activation.commissionEntitlement &&
      typeof activation.commissionEntitlement ===
        "object"
        ? activation.commissionEntitlement as Record<
            string,
            unknown
          >
        : null;

    const entitlementType =
      String(
        entitlement?.type ??
        ""
      ).trim();

    const entitlementSource =
      String(
        entitlement?.source ??
        ""
      ).trim();

    const entitlementRate =
      Number(
        entitlement?.rate
      );

    const foundingHostNumber =
      Number(
        activation.foundingHostNumber ??
        0
      );

    const isFoundingHost =
      activation.foundingHost === true &&
      entitlementType === "lifetime" &&
      entitlementSource ===
        "founding_host_cohort" &&
      entitlementRate === 0 &&
      Number.isInteger(
        foundingHostNumber
      ) &&
      foundingHostNumber >= 1 &&
      foundingHostNumber <= 200;

    const commissionRate =
      isFoundingHost
        ? 0
        : 0.05;

    const commissionPlan =
      isFoundingHost
        ? "founding_lifetime_zero"
        : "standard";

    const foundingLeadId =
      typeof activation.leadId === "string"
        ? activation.leadId.trim()
        : "";

    const commissionAmount =
      Math.round(
        amount * commissionRate
      );

    const hostAmount =
      amount - commissionAmount;


    if (
      !stripeAccountId ||
      !payoutsReady
    ) {
      return NextResponse.json(
        {
          error:
            "This Host has not completed KIVO payout setup.",
        },
        { status: 409 }
      );
    }

    /*
     * Checkout redirects
     */
    const appUrl =
      process.env
        .NEXT_PUBLIC_APP_URL
        ?.replace(
          /\/$/,
          ""
        );

    if (!appUrl) {
      return NextResponse.json(
        {
          error:
            "KIVO application URL is not configured.",
        },
        { status: 500 }
      );
    }

    /*
     * Stripe transfer_group links the
     * Driver charge with the later Host
     * transfer created after completion.
     */
    const transferGroup =
      `KIVO_${bookingRequestId}`;

    /*
     * Avoid duplicate Checkout Sessions
     * from double-clicks/retries.
     */
    const idempotencyKey =
      `kivo_checkout_${bookingRequestId}`;

    const session =
      await stripe.checkout.sessions.create(
        {
          mode:
            "payment",

          /*
           * KIVO MVP intentionally uses card-only Checkout.
           *
           * This keeps payment confirmation synchronous and
           * avoids unlocking private Host details while an
           * asynchronous payment method is still pending.
           */
          payment_method_types: [
            "card",
          ],

          success_url:
            `${appUrl}/driver/trips?payment=success&session_id={CHECKOUT_SESSION_ID}`,

          cancel_url:
            `${appUrl}/driver/trips?payment=cancelled`,

          customer_email:
            decoded.email ??
            undefined,

          line_items: [
            {
              quantity: 1,

              price_data: {
                currency:
                  "usd",

                unit_amount:
                  amount,

                product_data: {
                  name:
                    "KIVO charging session",

                  description:
                    [
                      booking.hostArea,
                      booking.requestedDate,
                      booking.requestedTime,
                    ]
                      .filter(Boolean)
                      .join(
                        " · "
                      ),
                },
              },
            },
          ],

          metadata: {
            bookingRequestId,
            driverUid:
              decoded.uid,
            hostUid,
            stripeHostAccountId:
              stripeAccountId,
          },

          payment_intent_data: {
            transfer_group:
              transferGroup,

            metadata: {
              bookingRequestId,
              driverUid:
                decoded.uid,
              hostUid,
              stripeHostAccountId:
                stripeAccountId,
            },
          },
        },
        {
          idempotencyKey,
        }
      );

    if (!session.url) {
      return NextResponse.json(
        {
          error:
            "Stripe did not return a Checkout URL.",
        },
        { status: 500 }
      );
    }

    /*
     * This does NOT mean payment happened.
     *
     * It records only the Stripe Checkout
     * Session that was created. A webhook
     * will later be the authority that
     * changes paymentStatus to "paid".
     */
    await bookingRef.set(
      {
        stripePayment: {
          checkoutSessionId:
            session.id,

          transferGroup,

          hostAccountId:
            stripeAccountId,

          amount,

          currency:
            "usd",

          checkoutStatus:
            "created",

          economics: {
            grossAmount:
              amount,

            commissionRate,

            commissionAmount,

            hostAmount,

            foundingHost:
              isFoundingHost,

            foundingHostNumber:
              isFoundingHost
                ? foundingHostNumber
                : null,

            commissionPlan,

            foundingLeadId:
              foundingLeadId ||
              null,
          },
        },
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      checkoutUrl:
        session.url,
      checkoutSessionId:
        session.id,
    });
  } catch (error) {
    console.error(
      "Create KIVO Stripe Checkout failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to start KIVO payment.",
      },
      { status: 500 }
    );
  }
}
