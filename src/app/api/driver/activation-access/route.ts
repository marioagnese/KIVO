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
            "Missing Driver activation authorization.",
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

    const userRef =
      adminDb
        .collection("users")
        .doc(uid);

    const activationRef =
      adminDb
        .collection("driverActivations")
        .doc(uid);

    const [
      userSnapshot,
      activationSnapshot,
    ] = await Promise.all([
      userRef.get(),
      activationRef.get(),
    ]);

    if (!userSnapshot.exists) {
      return NextResponse.json(
        {
          error:
            "KIVO account profile was not found.",
        },
        { status: 404 }
      );
    }

    const userData =
      userSnapshot.data() ?? {};

    const roles =
      Array.isArray(userData.roles)
        ? userData.roles
        : [];

    if (!roles.includes("driver")) {
      return NextResponse.json(
        {
          error:
            "KivoDriver access has not been added to this account.",
        },
        { status: 403 }
      );
    }

    let activation =
      activationSnapshot.exists
        ? activationSnapshot.data()
        : undefined;

    if (!activation) {
      const initialActivation = {
        uid,

        email:
          authenticatedEmail,

        status:
          "setup",

        profile: {
          status:
            "incomplete",
        },

        legal: {
          status:
            "incomplete",
          termsVersion:
            "",
          acceptedAt:
            null,
        },

        identitySafety: {
          status:
            "not_started",
          provider:
            "",
          verificationSessionId:
            "",
          verifiedAt:
            null,
        },

        bookingReadiness: {
          status:
            "incomplete",
        },

        createdAt:
          new Date(),

        updatedAt:
          new Date(),
      };

      await activationRef.set(
        initialActivation
      );

      activation =
        initialActivation;
    }

    return NextResponse.json({
      ok: true,

      driver: {
        uid,

        email:
          authenticatedEmail,

        displayName:
          String(
            userData.displayName ?? ""
          ),

        location:
          String(
            userData.location ?? ""
          ),

        vehicle:
          String(
            userData.driverVehicle ?? ""
          ),

        connector:
          String(
            userData.driverConnector ?? ""
          ),
      },

      activation: {
        status:
          String(
            activation.status ??
              "setup"
          ),

        profile: {
          status:
            String(
              activation.profile?.status ??
                "incomplete"
            ),
        },

        legal: {
          status:
            String(
              activation.legal?.status ??
                "incomplete"
            ),

          termsVersion:
            String(
              activation.legal?.termsVersion ??
                ""
            ),
        },

        identitySafety: {
          status:
            String(
              activation.identitySafety?.status ??
                "not_started"
            ),

          provider:
            String(
              activation.identitySafety?.provider ??
                ""
            ),
        },

        bookingReadiness: {
          status:
            String(
              activation.bookingReadiness?.status ??
                "incomplete"
            ),
        },
      },
    });
  } catch (error) {
    console.error(
      "Driver activation access failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load KivoDriver activation.",
      },
      { status: 500 }
    );
  }
}
