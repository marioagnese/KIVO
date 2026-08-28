import { NextResponse } from "next/server";

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
            "Missing Driver profile authorization.",
        },
        { status: 401 }
      );
    }

    const idToken =
      authorization
        .slice("Bearer ".length)
        .trim();

    const decodedToken =
      await adminAuth.verifyIdToken(idToken);

    const uid =
      decodedToken.uid;

    const authenticatedEmail =
      decodedToken.email
        ?.trim()
        .toLowerCase();

    if (!authenticatedEmail) {
      return NextResponse.json(
        {
          error:
            "A KIVO account email is required.",
        },
        { status: 401 }
      );
    }

    const body =
      await request.json();

    const displayName =
      String(
        body?.displayName ?? ""
      ).trim();

    const location =
      String(
        body?.location ?? ""
      ).trim();

    const vehicle =
      String(
        body?.vehicle ?? ""
      ).trim();

    const connector =
      String(
        body?.connector ?? ""
      ).trim();

    if (
      !displayName ||
      !location ||
      !vehicle ||
      !connector
    ) {
      return NextResponse.json(
        {
          error:
            "Name, location, vehicle and connector are required.",
        },
        { status: 400 }
      );
    }

    if (
      displayName.length > 100 ||
      location.length > 120 ||
      vehicle.length > 120 ||
      connector.length > 80
    ) {
      return NextResponse.json(
        {
          error:
            "One or more Driver profile fields are too long.",
        },
        { status: 400 }
      );
    }

    const userRef =
      adminDb
        .collection("users")
        .doc(uid);

    const activationRef =
      adminDb
        .collection("driverActivations")
        .doc(uid);

    await adminDb.runTransaction(
      async (transaction) => {
        const [
          userSnapshot,
          activationSnapshot,
        ] = await Promise.all([
          transaction.get(userRef),
          transaction.get(
            activationRef
          ),
        ]);

        if (!userSnapshot.exists) {
          throw new Error(
            "KIVO account profile was not found."
          );
        }

        const userData =
          userSnapshot.data() ?? {};

        const roles =
          Array.isArray(
            userData.roles
          )
            ? userData.roles
            : [];

        if (!roles.includes("driver")) {
          throw new Error(
            "KivoDriver access has not been added to this account."
          );
        }

        if (!activationSnapshot.exists) {
          throw new Error(
            "Driver activation record was not found."
          );
        }

        const activation =
          activationSnapshot.data() ?? {};

        const legalComplete =
          activation.legal?.status ===
          "complete";

        const identityComplete =
          activation.identitySafety?.status ===
          "verified";

        const bookingReady =
          legalComplete &&
          identityComplete;

        transaction.set(
          userRef,
          {
            displayName,
            location,

            driverVehicle:
              vehicle,

            driverConnector:
              connector,

            updatedAt:
              new Date(),
          },
          {
            merge: true,
          }
        );

        transaction.set(
          activationRef,
          {
            profile: {
              status:
                "complete",

              completedAt:
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
      }
    );

    return NextResponse.json({
      ok: true,

      profile: {
        status:
          "complete",

        displayName,
        location,
        vehicle,
        connector,
      },
    });
  } catch (error) {
    console.error(
      "Driver profile completion failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
        "KIVO account profile was not found." ||
      message ===
        "Driver activation record was not found."
    ) {
      return NextResponse.json(
        {
          error:
            message,
        },
        { status: 404 }
      );
    }

    if (
      message ===
      "KivoDriver access has not been added to this account."
    ) {
      return NextResponse.json(
        {
          error:
            message,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to save KivoDriver profile.",
      },
      { status: 500 }
    );
  }
}
