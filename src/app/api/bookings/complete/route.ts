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

export async function POST(request: Request) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "KIVO Host authentication required." },
        { status: 401 }
      );
    }

    const decoded =
      await adminAuth.verifyIdToken(
        authorization
          .slice("Bearer ".length)
          .trim()
      );

    const body = await request.json();

    const requestId =
      String(body.requestId ?? "").trim();

    if (!requestId) {
      return NextResponse.json(
        { error: "Booking request ID is required." },
        { status: 400 }
      );
    }

    const ref =
      adminDb
        .collection("bookingRequests")
        .doc(requestId);

    const snapshot =
      await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Booking request not found." },
        { status: 404 }
      );
    }

    const booking =
      snapshot.data() ?? {};

    if (booking.hostUid !== decoded.uid) {
      return NextResponse.json(
        {
          error:
            "This charging request belongs to another Host.",
        },
        { status: 403 }
      );
    }

    if (booking.status !== "accepted") {
      return NextResponse.json(
        {
          error:
            "Only an accepted charging session can be completed.",
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

    await ref.set(
      {
        status:
          "completed",

        completedAt:
          FieldValue.serverTimestamp(),

        updatedAt:
          FieldValue.serverTimestamp(),

        // Reserved for future payment architecture.
        // No money moves in this phase.
        settlementStatus:
          "not_started",
      },
      { merge: true }
    );

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(
        /\/$/,
        ""
      );

    let driverEmailSent = false;
    let hostEmailSent = false;

    if (appUrl && booking.driverEmail) {
      try {
        await sendKivoEmail({
          to:
            String(booking.driverEmail),
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

        driverEmailSent = true;
      } catch (emailError) {
        console.error(
          "Driver completion email failed:",
          emailError
        );
      }
    }

    const hostEmail =
      decoded.email?.trim().toLowerCase();

    if (appUrl && hostEmail) {
      try {
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
              "Payment settlement is not enabled during the current marketplace validation phase."
            ),
          buttonLabel:
            "View hosting activity",
          buttonUrl:
            appUrl,
          accent:
            "host",
        });

        hostEmailSent = true;
      } catch (emailError) {
        console.error(
          "Host completion email failed:",
          emailError
        );
      }
    }

    return NextResponse.json({
      ok: true,
      status: "completed",
      emails: {
        driver: driverEmailSent,
        host: hostEmailSent,
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
