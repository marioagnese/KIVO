import { NextResponse } from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization." },
        { status: 401 }
      );
    }

    const token =
      authorization
        .slice("Bearer ".length)
        .trim();

    const decoded =
      await adminAuth.verifyIdToken(token);

    if (
      !decoded.email ||
      decoded.email_verified !== true
    ) {
      return NextResponse.json(
        {
          error:
            "A verified KIVO account email is required.",
        },
        { status: 401 }
      );
    }

    const ref =
      adminDb
        .collection("driverActivations")
        .doc(decoded.uid);

    const snapshot =
      await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        {
          error:
            "Driver activation record was not found.",
        },
        { status: 404 }
      );
    }

    await ref.set(
      {
        identitySafety: {
          status:
            "pending_verification",

          provider:
            "development_placeholder",

          verificationSessionId:
            "",

          verifiedAt:
            null,

          requestedAt:
            new Date(),
        },

        bookingReadiness: {
          status:
            "incomplete",
        },

        status:
          "setup",

        updatedAt:
          new Date(),
      },
      {
        merge: true,
      }
    );

    return NextResponse.json({
      ok: true,

      identitySafety: {
        status:
          "pending_verification",

        provider:
          "development_placeholder",
      },
    });
  } catch (error) {
    console.error(
      "Driver safety start failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to start Driver verification.",
      },
      { status: 500 }
    );
  }
}
