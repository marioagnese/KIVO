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

    const privateAddress =
      String(body.privateAddress ?? "").trim();

    const arrivalInstructions =
      String(
        body.arrivalInstructions ?? ""
      ).trim();

    if (
      !requestId ||
      !privateAddress ||
      !arrivalInstructions
    ) {
      return NextResponse.json(
        {
          error:
            "Private charging address and arrival instructions are required.",
        },
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
            "Arrival details can only be shared for an accepted booking.",
        },
        { status: 409 }
      );
    }

    await ref.set(
      {
        privateAddress,
        arrivalInstructions,

        arrivalDetailsSharedAt:
          FieldValue.serverTimestamp(),

        updatedAt:
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
          await sendKivoEmail({
            to:
              String(booking.driverEmail),
            subject:
              "Your KIVO arrival details are ready",
            eyebrow:
              "KIVODRIVER",
            title:
              "Your Host has shared your arrival details.",
            body:
              kivoParagraph(
                "The private charging address and arrival instructions for your accepted session are now available securely inside KIVO."
              ) +
              kivoParagraph(
                "For Host privacy, KIVO does not include the private address in this email."
              ),
            buttonLabel:
              "View arrival details",
            buttonUrl:
              appUrl,
            accent:
              "driver",
          });

          emailSent = true;
        }
      } catch (emailError) {
        console.error(
          "Arrival details email failed:",
          emailError
        );
      }
    }

    return NextResponse.json({
      ok: true,
      emailSent,
    });
  } catch (error) {
    console.error(
      "Save KIVO arrival details failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to save arrival details.",
      },
      { status: 500 }
    );
  }
}
