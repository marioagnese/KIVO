import {
  NextResponse,
} from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";


function cleanString(
  value: unknown,
  maxLength: number
) {
  return String(
    value ?? ""
  )
    .trim()
    .slice(0, maxLength);
}


async function authenticateDriver(
  request: Request
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization?.startsWith(
      "Bearer "
    )
  ) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  const token =
    authorization
      .slice("Bearer ".length)
      .trim();

  const decoded =
    await adminAuth.verifyIdToken(
      token
    );

  const userRef =
    adminDb
      .collection("users")
      .doc(decoded.uid);

  const userSnapshot =
    await userRef.get();

  if (!userSnapshot.exists) {
    throw new Error(
      "ACCOUNT_NOT_FOUND"
    );
  }

  const userData =
    userSnapshot.data() ?? {};

  const roles =
    Array.isArray(userData.roles)
      ? userData.roles
      : [];

  if (!roles.includes("driver")) {
    throw new Error(
      "DRIVER_REQUIRED"
    );
  }

  return {
    uid: decoded.uid,
    email:
      decoded.email ??
      String(
        userData.email ?? ""
      ),
    userData,
  };
}


/* =========================================================
   GET DRIVER PROFILE
========================================================= */

export async function GET(
  request: Request
) {
  try {
    const {
      uid,
      email,
      userData,
    } =
      await authenticateDriver(
        request
      );

    const driverRef =
      adminDb
        .collection("drivers")
        .doc(uid);

    const driverSnapshot =
      await driverRef.get();

    if (!driverSnapshot.exists) {
      return NextResponse.json(
        {
          error:
            "KivoDriver profile was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const driver =
      driverSnapshot.data() ?? {};

    return NextResponse.json({
      ok: true,

      profile: {
        uid,

        email,

        displayName:
          String(
            driver.displayName ??
              userData.displayName ??
              ""
          ),

        publicAlias:
          String(
            driver.publicAlias ??
              driver.displayName ??
              userData.displayName ??
              ""
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

        identitySafety: {
          status:
            String(
              driver
                .identitySafety
                ?.status ?? ""
            ),
        },

        bookingReady:
          driver.bookingReady ===
          true,

        status:
          String(
            driver.status ?? ""
          ),

        activatedAt:
          driver.activatedAt
            ?.toDate?.()
            ?.toISOString?.() ??
          null,
      },
    });
  } catch (error) {
    console.error(
      "Driver profile read failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
      "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      message ===
        "ACCOUNT_NOT_FOUND" ||
      message ===
        "DRIVER_REQUIRED"
    ) {
      return NextResponse.json(
        {
          error:
            "KivoDriver access required.",
        },
        {
          status: 403,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to load KivoDriver profile.",
      },
      {
        status: 500,
      }
    );
  }
}


/* =========================================================
   UPDATE DRIVER PROFILE
========================================================= */

export async function PATCH(
  request: Request
) {
  try {
    const {
      uid,
    } =
      await authenticateDriver(
        request
      );

    const body =
      await request.json();

    const publicAlias =
      cleanString(
        body?.publicAlias,
        60
      );

    const bio =
      cleanString(
        body?.bio,
        500
      );

    const homeArea =
      cleanString(
        body?.homeArea,
        120
      );

    const vehicle =
      cleanString(
        body?.vehicle,
        120
      );

    const connector =
      cleanString(
        body?.connector,
        80
      );

    const photoPath =
      cleanString(
        body?.photoPath,
        500
      );

    if (!publicAlias) {
      return NextResponse.json(
        {
          error:
            "Your public Driver name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      photoPath &&
      !photoPath.startsWith(
        `driverProfiles/${uid}/`
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid Driver profile photo.",
        },
        {
          status: 400,
        }
      );
    }

    const driverRef =
      adminDb
        .collection("drivers")
        .doc(uid);

    const snapshot =
      await driverRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        {
          error:
            "KivoDriver profile was not found.",
        },
        {
          status: 404,
        }
      );
    }

    await driverRef.set(
      {
        publicAlias,
        bio,
        homeArea,
        vehicle,
        connector,
        photoPath,

        updatedAt:
          new Date(),
      },
      {
        merge: true,
      }
    );

    return NextResponse.json({
      ok: true,

      profile: {
        publicAlias,
        bio,
        homeArea,
        vehicle,
        connector,
        photoPath,
      },
    });
  } catch (error) {
    console.error(
      "Driver profile update failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
      "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      message ===
        "ACCOUNT_NOT_FOUND" ||
      message ===
        "DRIVER_REQUIRED"
    ) {
      return NextResponse.json(
        {
          error:
            "KivoDriver access required.",
        },
        {
          status: 403,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to update KivoDriver profile.",
      },
      {
        status: 500,
      }
    );
  }
}
