import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

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

    const idToken = authorization
      .slice("Bearer ".length)
      .trim();

    const decoded =
      await adminAuth.verifyIdToken(idToken);

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
        { error: "Host UID is required." },
        { status: 400 }
      );
    }

    const activationRef =
      adminDb.collection("hostActivations").doc(uid);

    const onboardingRef =
      adminDb.collection("hostOnboarding").doc(uid);

    const [
      activationSnapshot,
      onboardingSnapshot,
    ] = await Promise.all([
      activationRef.get(),
      onboardingRef.get(),
    ]);

    if (
      !activationSnapshot.exists ||
      !onboardingSnapshot.exists
    ) {
      return NextResponse.json(
        { error: "Host activation record not found." },
        { status: 404 }
      );
    }

    const activation =
      activationSnapshot.data() ?? {};

    const onboarding =
      onboardingSnapshot.data() ?? {};

    if (
      String(onboarding.status ?? "") !==
      "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "Only an approved Host can complete identity verification.",
        },
        { status: 409 }
      );
    }

    const safetyStatus =
      String(
        activation.identitySafety?.status ??
          activation.gates?.safety?.status ??
          "not_started"
      );

    if (
      safetyStatus !== "pending_verification" &&
      safetyStatus !== "complete"
    ) {
      return NextResponse.json(
        {
          error:
            "The Host must start identity verification first.",
        },
        { status: 409 }
      );
    }

    if (safetyStatus === "complete") {
      return NextResponse.json({
        ok: true,
        alreadyComplete: true,
      });
    }

    const now =
      FieldValue.serverTimestamp();

    await activationRef.set(
      {
        identitySafety: {
          status: "complete",
          provider: "kivo_admin_test",
          verifiedAt: now,
          verifiedByUid: decoded.uid,
          verifiedByEmail: adminEmail,
        },

        gates: {
          safety: {
            status: "complete",
            completedAt: now,
          },
        },

        updatedAt: now,
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      gate: {
        status: "complete",
      },
    });
  } catch (error) {
    console.error(
      "KIVO admin Host safety verification error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to complete Host identity verification.",
      },
      { status: 500 }
    );
  }
}
