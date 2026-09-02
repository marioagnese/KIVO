import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  kivoParagraph,
  sendKivoEmail,
} from "@/lib/kivoEmail";

import {
  stripe,
} from "@/lib/stripe";

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

    const body =
      await request.json();

    const requestId =
      String(
        body.requestId ?? ""
      ).trim();

    if (!requestId) {
      return NextResponse.json(
        {
          error:
            "Booking request ID is required.",
        },
        { status: 400 }
      );
    }

    const ref =
      adminDb
        .collection(
          "bookingRequests"
        )
        .doc(requestId);

    const snapshot =
      await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        {
          error:
            "Booking request not found.",
        },
        { status: 404 }
      );
    }

    const booking =
      snapshot.data() ?? {};

    if (
      booking.hostUid !==
      decoded.uid
    ) {
      return NextResponse.json(
        {
          error:
            "This charging request belongs to another Host.",
        },
        { status: 403 }
      );
    }

    /*
     * A settlement retry is allowed after the
     * real-world charging session has already been
     * marked completed.
     */
    if (
      booking.status !== "accepted" &&
      booking.status !== "completed"
    ) {
      return NextResponse.json(
        {
          error:
            "This charging session cannot be completed.",
        },
        { status: 409 }
      );
    }

    if (
      booking.paymentStatus !==
      "paid"
    ) {
      return NextResponse.json(
        {
          error:
            "Only a paid charging session can be completed.",
        },
        { status: 409 }
      );
    }

    if (
      !booking.privateAddress ||
      !booking.arrivalInstructions
    ) {
      return NextResponse.json(
        {
          error:
            "Arrival details must be shared before completing the session.",
        },
        { status: 409 }
      );
    }

    /*
     * Already transferred is a safe idempotent
     * completion response.
     */
    if (
      booking.status ===
        "completed" &&
      booking.settlementStatus ===
        "transferred"
    ) {
      return NextResponse.json({
        ok: true,
        status:
          "completed",
        settlementStatus:
          "transferred",
        transferId:
          booking.settlement
            ?.transferId ??
          null,
        alreadySettled:
          true,
      });
    }

    const stripePayment =
      booking.stripePayment &&
      typeof booking.stripePayment ===
        "object"
        ? booking.stripePayment as Record<
            string,
            unknown
          >
        : {};

    const hostAccountId =
      String(
        stripePayment.hostAccountId ??
        ""
      ).trim();

    const transferGroup =
      String(
        stripePayment.transferGroup ??
        ""
      ).trim();

    const paymentIntentId =
      String(
        stripePayment.paymentIntentId ??
        ""
      ).trim();

    let chargeId =
      String(
        stripePayment.chargeId ??
        ""
      ).trim();

    const grossAmount =
      Number(
        stripePayment.amount
      );

    const currency =
      String(
        stripePayment.currency ??
        ""
      )
        .trim()
        .toLowerCase();

    if (
      !hostAccountId ||
      !transferGroup ||
      !paymentIntentId ||
      !Number.isInteger(
        grossAmount
      ) ||
      grossAmount <= 0 ||
      currency !== "usd"
    ) {
      return NextResponse.json(
        {
          error:
            "This paid session is missing valid Stripe settlement information.",
        },
        { status: 409 }
      );
    }

    /*
     * Older paid bookings, including our current
     * sandbox test, predate chargeId persistence.
     * Recover the successful Charge from Stripe.
     */
    if (!chargeId) {
      const paymentIntent =
        await stripe.paymentIntents.retrieve(
          paymentIntentId
        );

      chargeId =
        typeof paymentIntent.latest_charge ===
          "string"
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge?.id ??
            "";
    }

    if (!chargeId) {
      return NextResponse.json(
        {
          error:
            "KIVO could not identify the successful Stripe charge for this session.",
        },
        { status: 409 }
      );
    }

    const economics =
      stripePayment.economics &&
      typeof stripePayment.economics ===
        "object"
        ? stripePayment.economics as Record<
            string,
            unknown
          >
        : null;

    let commissionRate:
      number;

    let commissionAmount:
      number;

    let hostAmount:
      number;

    let foundingHost:
      boolean;

    let foundingLeadId:
      string | null;

    /*
     * New bookings use their immutable Checkout
     * economics snapshot.
     *
     * Legacy paid bookings derive the entitlement
     * once from Host activation provenance and then
     * persist that snapshot below.
     */
    if (economics) {
      commissionRate =
        Number(
          economics.commissionRate
        );

      commissionAmount =
        Number(
          economics.commissionAmount
        );

      hostAmount =
        Number(
          economics.hostAmount
        );

      foundingHost =
        economics.foundingHost ===
        true;

      foundingLeadId =
        typeof economics.foundingLeadId ===
          "string"
          ? economics.foundingLeadId
          : null;
    } else {
      const activationSnapshot =
        await adminDb
          .collection(
            "hostActivations"
          )
          .doc(decoded.uid)
          .get();

      const activation =
        activationSnapshot.data() ??
        {};

      const leadId =
        typeof activation.leadId ===
          "string"
          ? activation.leadId.trim()
          : "";

      foundingHost =
        Boolean(leadId);

      foundingLeadId =
        leadId ||
        null;

      commissionRate =
        foundingHost
          ? 0
          : 0.05;

      commissionAmount =
        Math.round(
          grossAmount *
            commissionRate
        );

      hostAmount =
        grossAmount -
        commissionAmount;
    }

    if (
      !Number.isFinite(
        commissionRate
      ) ||
      commissionRate < 0 ||
      commissionRate > 1 ||
      !Number.isInteger(
        commissionAmount
      ) ||
      commissionAmount < 0 ||
      !Number.isInteger(
        hostAmount
      ) ||
      hostAmount <= 0 ||
      commissionAmount +
        hostAmount !==
        grossAmount
    ) {
      return NextResponse.json(
        {
          error:
            "This session has invalid KIVO settlement economics.",
        },
        { status: 409 }
      );
    }

    const wasAlreadyCompleted =
      booking.status ===
      "completed";

    /*
     * The real-world charging session is complete
     * independently of Stripe settlement.
     *
     * If Stripe temporarily fails, the session stays
     * completed and settlement may be retried.
     */
    await ref.set(
      {
        status:
          "completed",

        ...(wasAlreadyCompleted
          ? {}
          : {
              completedAt:
                FieldValue.serverTimestamp(),
            }),

        settlementStatus:
          "processing",

        stripePayment: {
          chargeId,

          economics: {
            grossAmount,
            commissionRate,
            commissionAmount,
            hostAmount,
            foundingHost,
            foundingLeadId,
          },
        },

        updatedAt:
          FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    let transferId:
      string;

    try {
      const transfer =
        await stripe.transfers.create(
          {
            amount:
              hostAmount,

            currency:
              "usd",

            destination:
              hostAccountId,

            transfer_group:
              transferGroup,

            source_transaction:
              chargeId,

            metadata: {
              bookingRequestId:
                requestId,

              hostUid:
                decoded.uid,

              foundingHost:
                String(
                  foundingHost
                ),

              kivoCommissionRate:
                String(
                  commissionRate
                ),
            },
          },
          {
            idempotencyKey:
              `kivo_settlement_${requestId}`,
          }
        );

      transferId =
        transfer.id;

      await ref.set(
        {
          settlementStatus:
            "transferred",

          settlement: {
            transferId,

            grossAmount,

            commissionRate,

            commissionAmount,

            hostAmount,

            currency:
              "usd",

            hostAccountId,

            chargeId,

            transferGroup,

            foundingHost,

            foundingLeadId,

            transferredAt:
              FieldValue.serverTimestamp(),
          },

          updatedAt:
            FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (settlementError) {
      console.error(
        "KIVO Host settlement failed:",
        {
          bookingRequestId:
            requestId,

          hostUid:
            decoded.uid,

          chargeId,

          hostAccountId,

          settlementError,
        }
      );

      await ref.set(
        {
          settlementStatus:
            "failed",

          settlement: {
            grossAmount,

            commissionRate,

            commissionAmount,

            hostAmount,

            currency:
              "usd",

            hostAccountId,

            chargeId,

            transferGroup,

            foundingHost,

            foundingLeadId,

            failedAt:
              FieldValue.serverTimestamp(),
          },

          updatedAt:
            FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return NextResponse.json({
        ok: true,
        status:
          "completed",
        settlementStatus:
          "failed",
        warning:
          "The charging session was completed, but Host settlement needs to be retried.",
      });
    }

    const appUrl =
      process.env
        .NEXT_PUBLIC_APP_URL
        ?.replace(
          /\/$/,
          ""
        );

    let driverEmailSent =
      false;

    let hostEmailSent =
      false;

    /*
     * Avoid duplicate completion emails when this
     * endpoint is being used only to retry settlement.
     */
    if (
      !wasAlreadyCompleted &&
      appUrl &&
      booking.driverEmail
    ) {
      try {
        await sendKivoEmail({
          to:
            String(
              booking.driverEmail
            ),

          subject:
            "Your KIVO charging session is complete",

          eyebrow:
            "KIVODRIVER",

          title:
            "Charging session complete.",

          body:
            kivoParagraph(
              "Your KIVO charging session has been marked complete."
            ) +
            kivoParagraph(
              "Your completed session is now part of your KIVO charging history."
            ),

          buttonLabel:
            "View my KIVO activity",

          buttonUrl:
            appUrl,

          accent:
            "driver",
        });

        driverEmailSent =
          true;
      } catch (emailError) {
        console.error(
          "Driver completion email failed:",
          emailError
        );
      }
    }

    const hostEmail =
      decoded.email
        ?.trim()
        .toLowerCase();

    if (
      !wasAlreadyCompleted &&
      appUrl &&
      hostEmail
    ) {
      try {
        const settlementMessage =
          foundingHost
            ? "Your Founding Host earnings have been transferred to your Stripe account with 0% KIVO commission."
            : "Your Host earnings have been transferred to your Stripe account after KIVO's 5% commission.";

        await sendKivoEmail({
          to:
            hostEmail,

          subject:
            "KIVO charging session completed",

          eyebrow:
            "KIVOHOST",

          title:
            "Session completed.",

          body:
            kivoParagraph(
              "The charging session has been marked complete and moved into your KIVO hosting history."
            ) +
            kivoParagraph(
              settlementMessage
            ),

          buttonLabel:
            "View hosting activity",

          buttonUrl:
            appUrl,

          accent:
            "host",
        });

        hostEmailSent =
          true;
      } catch (emailError) {
        console.error(
          "Host completion email failed:",
          emailError
        );
      }
    }

    return NextResponse.json({
      ok: true,

      status:
        "completed",

      settlementStatus:
        "transferred",

      transferId,

      economics: {
        grossAmount,
        commissionRate,
        commissionAmount,
        hostAmount,
        foundingHost,
      },

      emails: {
        driver:
          driverEmailSent,

        host:
          hostEmailSent,
      },
    });
  } catch (error) {
    console.error(
      "Complete KIVO charging session failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to complete the charging session.",
      },
      { status: 500 }
    );
  }
}
