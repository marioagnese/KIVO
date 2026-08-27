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

    const consentToVerification =
      body.consentToVerification === true;

    const identityInformationConfirmed =
      body.identityInformationConfirmed === true;

    if (
      !consentToVerification ||
      !identityInformationConfirmed
    ) {
      return NextResponse.json(
        {
          error:
            "Confirm your identity information and consent before starting verification.",
        },
        { status: 400 }
      );
    }

    const onboardingRef =
      adminDb
        .collection("hostOnboarding")
        .doc(uid);

    const activationRef =
      adminDb
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

    /*
     * IMPORTANT:
     *
     * This does NOT verify the Host.
     *
     * It records that the Host is ready for KIVO's
     * third-party identity/safety verification process.
     *
     * A future provider callback/admin verification action
     * will be responsible for changing this gate to COMPLETE.
     */

    await activationRef.set(
      {
        identitySafety: {
          status:
            "pending_verification",

          identityInformationConfirmed:
            true,

          consentToVerification:
            true,

          requestedAt:
            FieldValue.serverTimestamp(),

          requestedByUid:
            uid,

          requestedByEmail:
            authenticatedEmail,

          provider:
            "not_configured",
        },

        gates: {
          safety: {
            status:
              "pending_verification",

            requestedAt:
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

      verification: {
        status:
          "pending_verification",
        provider:
          "not_configured",
      },

      gate: {
        status:
          "pending_verification",
      },

      verified: false,
    });
  } catch (error) {
    console.error(
      "KIVO Host safety verification start error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to start KIVO identity verification.",
      },
      { status: 500 }
    );
  }
}
