import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

type RequiredPhotoKey = "charger" | "parking" | "arrival";

const REQUIRED_PHOTOS: RequiredPhotoKey[] = ["charger", "parking", "arrival"];

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "KIVO Host authentication required.",
        },
        { status: 401 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(
      authorization.slice("Bearer ".length).trim(),
    );

    const body = await request.json();

    const incoming =
      body.photos && typeof body.photos === "object" ? body.photos : {};

    const photos: Record<RequiredPhotoKey, string> = {
      charger: String(incoming.charger ?? "").trim(),
      parking: String(incoming.parking ?? "").trim(),
      arrival: String(incoming.arrival ?? "").trim(),
    };

    const expectedPrefix = `hostOnboarding/${decoded.uid}/photos/`;

    for (const key of REQUIRED_PHOTOS) {
      if (!photos[key] || !photos[key].startsWith(expectedPrefix)) {
        return NextResponse.json(
          {
            error:
              "All required Host photos must be uploaded through the secure KIVO photo flow.",
          },
          { status: 400 },
        );
      }
    }

    const [onboardingSnapshot, activationSnapshot] = await Promise.all([
      adminDb.collection("hostOnboarding").doc(decoded.uid).get(),

      adminDb.collection("hostActivations").doc(decoded.uid).get(),
    ]);

    if (!onboardingSnapshot.exists || !activationSnapshot.exists) {
      return NextResponse.json(
        {
          error: "Host activation records were not found.",
        },
        { status: 404 },
      );
    }

    const onboarding = onboardingSnapshot.data() ?? {};

    if (onboarding.status !== "approved") {
      return NextResponse.json(
        {
          error:
            "Host setup must be approved before completing activation photos.",
        },
        { status: 409 },
      );
    }

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (!bucketName) {
      return NextResponse.json(
        {
          error: "KIVO photo storage is not configured.",
        },
        { status: 500 },
      );
    }

    const bucket = getStorage().bucket(bucketName);

    const existenceChecks = await Promise.all(
      REQUIRED_PHOTOS.map(async (key) => {
        const [exists] = await bucket.file(photos[key]).exists();

        return {
          key,
          exists,
        };
      }),
    );

    const missing = existenceChecks
      .filter((item) => !item.exists)
      .map((item) => item.key);

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `KIVO could not verify the required photo uploads: ${missing.join(
            ", ",
          )}.`,
        },
        { status: 400 },
      );
    }

    const batch = adminDb.batch();

    batch.set(
      onboardingSnapshot.ref,
      {
        photos: {
          charger: photos.charger,
          parking: photos.parking,
          arrival: photos.arrival,
        },

        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    batch.set(
      activationSnapshot.ref,
      {
        gates: {
          photos: {
            status: "complete",

            completedAt: FieldValue.serverTimestamp(),

            source: "host_activation",
          },
        },

        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await batch.commit();

    return NextResponse.json({
      ok: true,

      gate: {
        status: "complete",
      },
    });
  } catch (error) {
    console.error("KIVO Host activation photo error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete Host photos.",
      },
      { status: 500 },
    );
  }
}
