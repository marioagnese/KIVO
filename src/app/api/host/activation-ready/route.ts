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
        {
          error:
            "KIVO Host authentication required.",
        },
        { status: 401 }
      );
    }

    const decoded =
      await adminAuth.verifyIdToken(
        authorization
          .slice("Bearer ".length)
          .trim()
      );

    const uid = decoded.uid;

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
            "Host activation records were not found.",
        },
        { status: 404 }
      );
    }

    const onboarding =
      onboardingSnapshot.data() ?? {};

    const activation =
      activationSnapshot.data() ?? {};

    if (
      String(onboarding.status ?? "") !==
      "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "Host setup is not ready for final activation.",
        },
        { status: 409 }
      );
    }

    if (activation.status === "active") {
      return NextResponse.json({
        ok: true,
        status: "active",
      });
    }

    const photosComplete =
      activation.gates?.photos?.status ===
        "complete" ||
      (
        typeof onboarding.photos?.charger ===
          "string" &&
        Boolean(onboarding.photos.charger) &&
        typeof onboarding.photos?.parking ===
          "string" &&
        Boolean(onboarding.photos.parking) &&
        typeof onboarding.photos?.arrival ===
          "string" &&
        Boolean(onboarding.photos.arrival)
      );

    /*
     * HOST SELF-SERVICE READINESS CHECK
     *
     * Every operational prerequisite must be complete
     * before the Host can enter the final KIVO review queue.
     *
     * This endpoint NEVER grants the Host role and NEVER
     * creates/publishes the public marketplace listing.
     */
    const requiredGates = {
      safety:
        activation.gates?.safety?.status,

      propertyAccess:
        activation.gates
          ?.propertyAccess?.status,

      charger:
        activation.gates?.charger?.status,

      legal:
        activation.gates?.legal?.status,

      listing:
        activation.gates?.listing?.status,

      photos:
        photosComplete
          ? "complete"
          : activation.gates?.photos?.status,

      payouts:
        activation.gates?.payouts?.status,
    };

    const incomplete =
      Object.entries(requiredGates)
        .filter(
          ([, status]) =>
            status !== "complete"
        )
        .map(([name]) => name);

    if (incomplete.length > 0) {
      return NextResponse.json(
        {
          error:
            `Host activation is incomplete: ${incomplete.join(
              ", "
            )}.`,
        },
        { status: 409 }
      );
    }

    if (
      activation.status ===
      "ready_for_final_approval"
    ) {
      return NextResponse.json({
        ok: true,
        status:
          "ready_for_final_approval",
        alreadyReady: true,
      });
    }

    await activationRef.set(
      {
        status:
          "ready_for_final_approval",

        readyForFinalApprovalAt:
          FieldValue.serverTimestamp(),

        updatedAt:
          FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      status:
        "ready_for_final_approval",
    });
  } catch (error) {
    console.error(
      "Unable to mark Host ready for final approval:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete Host activation setup.",
      },
      { status: 500 }
    );
  }
}
