import { NextResponse } from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

const TERMS_VERSION =
  "2026-08-v1";

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

    if (!decoded.email) {
      return NextResponse.json(
        {
          error:
            "A KIVO account email is required.",
        },
        { status: 401 }
      );
    }

    const uid =
      decoded.uid;

    const activationRef =
      adminDb
        .collection("driverActivations")
        .doc(uid);

    const snapshot =
      await activationRef.get();

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

    const profileComplete =
      activation.profile?.status ===
      "complete";

    const identityComplete =
      activation.identitySafety?.status ===
      "verified";

    const bookingReady =
      profileComplete &&
      identityComplete;

    await activationRef.set(
      {
        legal: {
          status: "complete",
          termsVersion:
            TERMS_VERSION,
          acceptedAt:
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

      legal: {
        status: "complete",
        termsVersion:
          TERMS_VERSION,
      },

      bookingReadiness: {
        status:
          bookingReady
            ? "complete"
            : "incomplete",
      },
    });
  } catch (error) {
    console.error(
      "Driver agreement acceptance failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to accept Driver Agreement.",
      },
      { status: 500 }
    );
  }
}
