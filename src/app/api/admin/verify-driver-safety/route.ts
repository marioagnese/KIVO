import { NextResponse } from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    if (
      process.env.NODE_ENV ===
      "production"
    ) {
      return NextResponse.json(
        {
          error:
            "Development verification is disabled in production.",
        },
        { status: 403 }
      );
    }

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

    const uid =
      decoded.uid;

    const ref =
      adminDb
        .collection("driverActivations")
        .doc(uid);

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

    const activation =
      snapshot.data() ?? {};

    if (
      activation.identitySafety?.status !==
      "pending_verification"
    ) {
      return NextResponse.json(
        {
          error:
            "Driver verification must be pending first.",
        },
        { status: 400 }
      );
    }

    const profileComplete =
      activation.profile?.status ===
      "complete";

    const legalComplete =
      activation.legal?.status ===
      "complete";

    const bookingReady =
      profileComplete &&
      legalComplete;

    await ref.set(
      {
        identitySafety: {
          status:
            "verified",

          provider:
            "development_placeholder",

          verificationSessionId:
            "development-test",

          verifiedAt:
            new Date(),
        },

        bookingReadiness: {
          status:
            bookingReady
              ? "complete"
              : "incomplete",
        },

        status:
          bookingReady
            ? "booking_ready"
            : "setup",

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
          "verified",
      },

      bookingReadiness: {
        status:
          bookingReady
            ? "complete"
            : "incomplete",
      },

      status:
        bookingReady
          ? "booking_ready"
          : "setup",
    });
  } catch (error) {
    console.error(
      "Development Driver verification failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to complete test Driver verification.",
      },
      { status: 500 }
    );
  }
}
