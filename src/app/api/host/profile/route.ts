import {
  NextResponse,
} from "next/server";

import {
  FieldValue,
} from "firebase-admin/firestore";

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


async function authenticateHost(
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
    Array.isArray(
      userData.roles
    )
      ? userData.roles
      : [];

  if (!roles.includes("host")) {
    throw new Error(
      "HOST_REQUIRED"
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
   GET HOST PROFILE
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
      await authenticateHost(
        request
      );

    const profileRef =
      adminDb
        .collection("hostProfiles")
        .doc(uid);

    const [
      profileSnapshot,
      activationSnapshot,
      onboardingSnapshot,
      listingSnapshot,
    ] =
      await Promise.all([
        profileRef.get(),

        adminDb
          .collection(
            "hostActivations"
          )
          .doc(uid)
          .get(),

        adminDb
          .collection(
            "hostOnboarding"
          )
          .doc(uid)
          .get(),

        adminDb
          .collection("hosts")
          .where(
            "ownerUid",
            "==",
            uid
          )
          .limit(1)
          .get(),
      ]);

    const existingProfile =
      profileSnapshot.data() ??
      {};

    const activation =
      activationSnapshot.data() ??
      {};

    const onboarding =
      onboardingSnapshot.data() ??
      {};

    const listing =
      listingSnapshot.empty
        ? {}
        : listingSnapshot.docs[0]
            .data();

    const activationPublicListing =
      activation.publicListing &&
      typeof activation.publicListing ===
        "object"
        ? activation.publicListing
        : {};

    /*
     * Carry forward approved information KIVO already has.
     *
     * The Host should not have to rebuild a profile after
     * completing onboarding and activation.
     */
    const carriedDisplayName =
      String(
        existingProfile.displayName ??
        listing.hostPublicName ??
        activationPublicListing.displayName ??
        onboarding.name ??
        userData.displayName ??
        ""
      ).trim();

    const carriedPublicAlias =
      String(
        existingProfile.publicAlias ??
        listing.hostPublicName ??
        activationPublicListing.displayName ??
        onboarding.name ??
        userData.displayName ??
        ""
      ).trim();

    const carriedBio =
      String(
        existingProfile.bio ||
        listing.hostBio ||
        ""
      ).trim();

    const carriedPhotoPath =
      String(
        existingProfile.photoPath ??
        ""
      ).trim();

    const carriedSafetyStatus =
      String(
        existingProfile
          .identitySafety
          ?.status ||
        activation
          .identitySafety
          ?.status ||
        ""
      ).trim();

    /*
     * Existing active Hosts may predate hostProfiles.
     * Backfill safely on first profile read.
     */
    /*
     * Backfill older active Hosts and also fill any durable
     * profile fields that were never created previously.
     *
     * Existing Host-entered profile values always win.
     */
    await profileRef.set(
      {
        ownerUid: uid,

        displayName:
          carriedDisplayName,

        publicAlias:
          carriedPublicAlias,

        bio:
          carriedBio,

        photoPath:
          carriedPhotoPath,

        identitySafety: {
          status:
            carriedSafetyStatus,
        },

        status:
          String(
            existingProfile.status ??
            activation.status ??
            "active"
          ),

        activatedAt:
          existingProfile.activatedAt ??
          activation.activatedAt ??
          FieldValue.serverTimestamp(),

        updatedAt:
          FieldValue.serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    const refreshed =
      await profileRef.get();

    const profile =
      refreshed.data() ?? {};

    return NextResponse.json({
      ok: true,

      profile: {
        uid,

        email,

        /*
         * Private account information carried from the
         * approved Host onboarding record. This is returned
         * only to the authenticated Host and is not part of
         * the public marketplace profile.
         */
        phone:
          String(
            onboarding.phone ?? ""
          ),

        displayName:
          String(
            profile.displayName ??
            userData.displayName ??
            ""
          ),

        publicAlias:
          String(
            profile.publicAlias ??
            profile.displayName ??
            userData.displayName ??
            ""
          ),

        bio:
          String(
            profile.bio ?? ""
          ),

        photoPath:
          String(
            profile.photoPath ?? ""
          ),

        identitySafety: {
          status:
            String(
              profile
                .identitySafety
                ?.status ?? ""
            ),
        },

        status:
          String(
            profile.status ?? ""
          ),

        activatedAt:
          profile.activatedAt
            ?.toDate?.()
            ?.toISOString?.() ??
          null,

        foundingHost:
          activation.foundingHost === true,

        foundingHostNumber:
          Number.isInteger(
            Number(
              activation.foundingHostNumber
            )
          )
            ? Number(
                activation.foundingHostNumber
              )
            : null,

        commissionPlan:
          String(
            activation.commissionPlan ??
              "standard"
          ),
      },
    });
  } catch (error) {
    console.error(
      "Host profile read failed:",
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
        "HOST_REQUIRED"
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

    return NextResponse.json(
      {
        error:
          "Unable to load KivoHost profile.",
      },
      {
        status: 500,
      }
    );
  }
}


/* =========================================================
   UPDATE HOST PROFILE
========================================================= */

export async function PATCH(
  request: Request
) {
  try {
    const {
      uid,
    } =
      await authenticateHost(
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

    const photoPath =
      cleanString(
        body?.photoPath,
        300
      );

    if (!publicAlias) {
      return NextResponse.json(
        {
          error:
            "Public Host name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      photoPath &&
      !photoPath.startsWith(
        `hostProfiles/${uid}/`
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid Host profile photo path.",
        },
        {
          status: 400,
        }
      );
    }

    const profileRef =
      adminDb
        .collection("hostProfiles")
        .doc(uid);

    const profileSnapshot =
      await profileRef.get();

    if (!profileSnapshot.exists) {
      return NextResponse.json(
        {
          error:
            "KivoHost profile was not found.",
        },
        {
          status: 404,
        }
      );
    }

    await profileRef.set(
      {
        publicAlias,
        bio,
        photoPath,

        updatedAt:
          FieldValue.serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    const updated =
      await profileRef.get();

    const profile =
      updated.data() ?? {};

    return NextResponse.json({
      ok: true,

      profile: {
        uid,

        displayName:
          String(
            profile.displayName ?? ""
          ),

        publicAlias:
          String(
            profile.publicAlias ?? ""
          ),

        bio:
          String(
            profile.bio ?? ""
          ),

        photoPath:
          String(
            profile.photoPath ?? ""
          ),

        identitySafety: {
          status:
            String(
              profile
                .identitySafety
                ?.status ?? ""
            ),
        },

        status:
          String(
            profile.status ?? ""
          ),
      },
    });
  } catch (error) {
    console.error(
      "Host profile update failed:",
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
        "HOST_REQUIRED"
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

    return NextResponse.json(
      {
        error:
          "Unable to update KivoHost profile.",
      },
      {
        status: 500,
      }
    );
  }
}
