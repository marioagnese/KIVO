import {
  NextResponse,
} from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";


export async function POST(
  request: Request
) {
  try {
    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization?.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          error:
            "KIVO Host authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const decoded =
      await adminAuth.verifyIdToken(
        authorization
          .slice("Bearer ".length)
          .trim()
      );

    const hostUser =
      await adminDb
        .collection("users")
        .doc(decoded.uid)
        .get();

    const roles =
      hostUser.exists &&
      Array.isArray(
        hostUser.data()?.roles
      )
        ? hostUser
            .data()
            ?.roles
        : [];

    if (
      !roles.includes("host")
    ) {
      return NextResponse.json(
        {
          error:
            "KivoHost access required.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const driverUid =
      String(
        body?.driverUid ?? ""
      ).trim();

    if (!driverUid) {
      return NextResponse.json(
        {
          error:
            "Driver UID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Only expose a Driver profile if this Host
     * actually has a booking relationship with
     * that Driver.
     */
    const bookingSnapshot =
      await adminDb
        .collection(
          "bookingRequests"
        )
        .where(
          "hostUid",
          "==",
          decoded.uid
        )
        .where(
          "driverUid",
          "==",
          driverUid
        )
        .limit(1)
        .get();

    if (
      bookingSnapshot.empty
    ) {
      return NextResponse.json(
        {
          error:
            "Driver profile is not available to this Host.",
        },
        {
          status: 403,
        }
      );
    }

    const driverSnapshot =
      await adminDb
        .collection("drivers")
        .doc(driverUid)
        .get();

    if (
      !driverSnapshot.exists
    ) {
      return NextResponse.json(
        {
          profile: null,
        }
      );
    }

    const driver =
      driverSnapshot.data() ?? {};

    return NextResponse.json({
      ok: true,

      profile: {
        uid:
          driverUid,

        publicAlias:
          String(
            driver.publicAlias ??
              driver.displayName ??
              "KIVO Driver"
          ),

        bio:
          String(
            driver.bio ?? ""
          ),

        homeArea:
          String(
            driver.homeArea ?? ""
          ),

        vehicle:
          String(
            driver.vehicle ?? ""
          ),

        connector:
          String(
            driver.connector ?? ""
          ),

        photoPath:
          String(
            driver.photoPath ?? ""
          ),

        verified:
          driver
            .identitySafety
            ?.status ===
          "verified",

        bookingReady:
          driver.bookingReady ===
          true,
      },
    });
  } catch (error) {
    console.error(
      "Host Driver profile lookup failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load Driver profile.",
      },
      {
        status: 500,
      }
    );
  }
}
