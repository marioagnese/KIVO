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

    const status =
      String(body.status ?? "").trim();

    if (
      !requestId ||
      !["accepted", "declined"].includes(status)
    ) {
      return NextResponse.json(
        { error: "Invalid booking status update." },
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

    if (booking.status !== "pending") {
      return NextResponse.json(
        {
          error:
            "Only pending requests can be accepted or declined.",
        },
        { status: 409 }
      );
    }

    await ref.set(
      {
        status,

        ...(status === "accepted"
          ? {
              paymentStatus:
                "required",

              paymentRequiredAt:
                FieldValue.serverTimestamp(),
            }
          : {}),

        updatedAt:
          FieldValue.serverTimestamp(),

        decisionAt:
          FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    let emailSent = false;

    if (booking.driverEmail) {
      try {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL?.replace(
            /\/$/,
            ""
          );

        if (appUrl) {
          const accepted =
            status === "accepted";

          await sendKivoEmail({
            to:
              String(booking.driverEmail),
            subject:
              accepted
                ? "Your KIVO charging request was accepted"
                : "Your KIVO charging request was declined",
            eyebrow:
              "KIVODRIVER",
            title:
              accepted
                ? "Your Host accepted the request."
                : "This Host isn’t available for your request.",
            body:
              accepted
                ? kivoParagraph(
                    `Your charging request for ${booking.requestedTime || "the selected time"} has been accepted.`
                  ) +
                  kivoParagraph(
                    "Payment is now required to confirm your charging session."
                  ) +
                  kivoParagraph(
                    "Once KIVO confirms your payment, your Host can securely provide the private charging address and arrival instructions."
                  ) +
                  kivoParagraph(
                    "Open KIVO to complete payment and view your booking."
                  )
                : kivoParagraph(
                    `The Host was unable to accept your charging request for ${booking.requestedTime || "the selected time"}.`
                  ) +
                  kivoParagraph(
                    "You can return to KIVO and search for another available neighborhood charger."
                  ),
            buttonLabel:
              accepted
                ? "View accepted request"
                : "Find another charger",
            buttonUrl:
              appUrl,
            accent:
              "driver",
          });

          emailSent = true;
        }
      } catch (emailError) {
        console.error(
          "Booking decision email failed:",
          emailError
        );
      }
    }

    return NextResponse.json({
      ok: true,
      status,
      emailSent,
    });
  } catch (error) {
    console.error(
      "Update KIVO booking status failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to update the charging request.",
      },
      { status: 500 }
    );
  }
}
