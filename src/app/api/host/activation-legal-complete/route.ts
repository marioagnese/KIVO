import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  KIVO_HOST_AGREEMENT_TITLE,
  KIVO_HOST_AGREEMENT_VERSION,
} from "@/components/host/KivoHostAgreement";

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

    const idToken =
      authorization
        .slice("Bearer ".length)
        .trim();

    const decodedToken =
      await adminAuth.verifyIdToken(idToken);

    const uid = decodedToken.uid;

    const authenticatedEmail =
      decodedToken.email
        ?.trim()
        .toLowerCase();

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

    if (
      body.accepted !== true ||
      String(body.version ?? "") !==
        KIVO_HOST_AGREEMENT_VERSION
    ) {
      return NextResponse.json(
        {
          error:
            "The current KIVO Host Agreement must be accepted.",
        },
        { status: 400 }
      );
    }

    const onboardingRef =
      adminDb.collection("hostOnboarding").doc(uid);

    const activationRef =
      adminDb.collection("hostActivations").doc(uid);

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

    await activationRef.set(
      {
        legalAcceptance: {
          hostAgreement: {
            title:
              KIVO_HOST_AGREEMENT_TITLE,
            version:
              KIVO_HOST_AGREEMENT_VERSION,
            accepted: true,
            acceptedByUid: uid,
            acceptedByEmail:
              authenticatedEmail,
            acceptedAt:
              FieldValue.serverTimestamp(),
            userAgent:
              request.headers.get("user-agent") ?? "",
          },
        },

        gates: {
          legal: {
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
      version:
        KIVO_HOST_AGREEMENT_VERSION,
    });
  } catch (error) {
    console.error(
      "KIVO Host legal activation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to save KIVO Host Agreement acceptance.",
      },
      { status: 500 }
    );
  }
}
