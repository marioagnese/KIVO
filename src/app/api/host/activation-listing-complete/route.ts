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
        { error: "A verified KIVO account is required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const displayName =
      String(body.displayName ?? "").trim();

    const city =
      String(body.city ?? "").trim();

    const state =
      String(body.state ?? "")
        .trim()
        .toUpperCase();

    const postalCode =
      String(body.postalCode ?? "").trim();

    const amenities =
      Array.isArray(body.amenities)
        ? body.amenities
            .filter(
              (item: unknown): item is string =>
                typeof item === "string"
            )
            .map((item: string) => item.trim())
            .filter(Boolean)
        : [];

    const publicInformationConfirmed =
      body.publicInformationConfirmed === true;

    const addressPrivacyAcknowledged =
      body.addressPrivacyAcknowledged === true;

    if (
      !displayName ||
      !city ||
      !state ||
      !postalCode ||
      !publicInformationConfirmed ||
      !addressPrivacyAcknowledged
    ) {
      return NextResponse.json(
        {
          error:
            "Please review and confirm the required public listing information.",
        },
        { status: 400 }
      );
    }

    const [
      onboardingSnapshot,
      activationSnapshot,
    ] = await Promise.all([
      adminDb
        .collection("hostOnboarding")
        .doc(uid)
        .get(),

      adminDb
        .collection("hostActivations")
        .doc(uid)
        .get(),
    ]);

    if (!onboardingSnapshot.exists) {
      return NextResponse.json(
        { error: "Approved Host setup was not found." },
        { status: 404 }
      );
    }

    if (!activationSnapshot.exists) {
      return NextResponse.json(
        { error: "Host activation has not been initialized." },
        { status: 404 }
      );
    }

    const onboarding =
      onboardingSnapshot.data();

    const activation =
      activationSnapshot.data();

    if (
      !onboarding ||
      onboarding.status !== "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "Your Host setup has not reached final activation yet.",
        },
        { status: 403 }
      );
    }

    const approvedEmail =
      String(onboarding.email ?? "")
        .trim()
        .toLowerCase();

    if (
      !approvedEmail ||
      approvedEmail !== authenticatedEmail
    ) {
      return NextResponse.json(
        {
          error:
            "This Host activation does not belong to the signed-in account.",
        },
        { status: 403 }
      );
    }

    if (!activation) {
      return NextResponse.json(
        { error: "Host activation record is unavailable." },
        { status: 404 }
      );
    }

    /*
     * IMPORTANT:
     *
     * This stores the Host-approved PUBLIC-SAFE listing
     * information inside the private activation record.
     *
     * It does NOT create a document in the public hosts
     * marketplace collection and does NOT make the charger
     * discoverable or bookable.
     *
     * Final publication remains a KIVO-controlled admin action.
     */

    await activationSnapshot.ref.set(
      {
        publicListing: {
          displayName,
          city,
          state,
          postalCode,
          amenities,

          publicInformationConfirmed: true,
          addressPrivacyAcknowledged: true,

          confirmedAt:
            FieldValue.serverTimestamp(),

          source:
            "host_activation",
        },

        gates: {
          listing: {
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

      listing: {
        displayName,
        city,
        state,
        postalCode,
        amenities,
        publicInformationConfirmed: true,
        addressPrivacyAcknowledged: true,
      },

      gate: {
        status: "complete",
      },

      published: false,
    });
  } catch (error) {
    console.error(
      "KIVO Host listing confirmation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save KIVO public listing confirmation.",
      },
      { status: 500 }
    );
  }
}
