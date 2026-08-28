import { NextResponse } from "next/server";

import {
  adminAuth,
  adminDb,
  KIVO_ADMIN_EMAIL,
} from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing admin authorization." },
        { status: 401 }
      );
    }

    const token = authorization
      .slice("Bearer ".length)
      .trim();

    const decoded =
      await adminAuth.verifyIdToken(token);

    const adminEmail =
      decoded.email?.trim().toLowerCase();

    if (
      !adminEmail ||
      adminEmail !==
        KIVO_ADMIN_EMAIL.trim().toLowerCase()
    ) {
      return NextResponse.json(
        { error: "KIVO admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const uid = String(body.uid ?? "").trim();

    if (!uid) {
      return NextResponse.json(
        { error: "Driver UID is required." },
        { status: 400 }
      );
    }

    const ref = adminDb
      .collection("driverActivations")
      .doc(uid);

    const snapshot = await ref.get();

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
      activation.profile?.status === "complete";

    const legalComplete =
      activation.legal?.status === "complete";

    const bookingReady =
      profileComplete && legalComplete;

    await ref.set(
      {
        identitySafety: {
          ...activation.identitySafety,
          status: "verified",
          provider:
            "kivo_admin_test_bridge",
          verificationSessionId:
            "admin-test-verification",
          verifiedAt: new Date(),
          verifiedBy: adminEmail,
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

        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,

      identitySafety: {
        status: "verified",
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
      "Admin Driver verification failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to complete Driver test verification.",
      },
      { status: 500 }
    );
  }
}
