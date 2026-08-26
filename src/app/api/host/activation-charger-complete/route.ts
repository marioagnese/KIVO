import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

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
        { error: "Missing activation authorization." },
        { status: 401 }
      );
    }

    const idToken = authorization
      .slice("Bearer ".length)
      .trim();

    const decodedToken =
      await adminAuth.verifyIdToken(idToken);

    const uid = decodedToken.uid;

    const authenticatedEmail =
      decodedToken.email?.trim().toLowerCase();

    if (
      !authenticatedEmail ||
      decodedToken.email_verified !== true
    ) {
      return NextResponse.json(
        {
          error:
            "A verified KIVO account email is required.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const informationConfirmed =
      body.informationConfirmed === true;

    const operationalConfirmed =
      body.operationalConfirmed === true;

    if (
      !informationConfirmed ||
      !operationalConfirmed
    ) {
      return NextResponse.json(
        {
          error:
            "Confirm the charger information and operational status before continuing.",
        },
        { status: 400 }
      );
    }

    const onboardingRef = adminDb
      .collection("hostOnboarding")
      .doc(uid);

    const activationRef = adminDb
      .collection("hostActivations")
      .doc(uid);

    const [
      onboardingSnapshot,
      activationSnapshot,
    ] = await Promise.all([
      onboardingRef.get(),
      activationRef.get(),
    ]);

    if (
      !onboardingSnapshot.exists ||
      !activationSnapshot.exists
    ) {
      return NextResponse.json(
        {
          error:
            "Host activation record was not found.",
        },
        { status: 404 }
      );
    }

    const onboarding =
      onboardingSnapshot.data();

    const approvedEmail =
      String(onboarding?.email ?? "")
        .trim()
        .toLowerCase();

    if (
      onboarding?.status !== "approved" ||
      approvedEmail !== authenticatedEmail
    ) {
      return NextResponse.json(
        {
          error:
            "This Host activation is not authorized for the signed-in account.",
        },
        { status: 403 }
      );
    }

    const chargerSnapshot =
      onboarding?.charger ?? {};

    await activationRef.set(
      {
        chargerConfirmation: {
          informationConfirmed: true,
          operationalConfirmed: true,

          confirmedCharger: chargerSnapshot,

          confirmedAt:
            FieldValue.serverTimestamp(),
        },

        gates: {
          charger: {
            status: "complete",
            completedAt:
              FieldValue.serverTimestamp(),
          },
        },

        updatedAt:
          FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "KIVO Host charger activation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to save KIVO charger confirmation.",
      },
      { status: 500 }
    );
  }
}
