import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";


const AVAILABILITY_OPTIONS = [
  "Weekday mornings",
  "Weekday afternoons",
  "Weekday evenings",
  "Weekends",
  "Overnight",
  "Varies — I’ll approve individually",
];

const AMENITY_OPTIONS = [
  "Wi-Fi",
  "Coffee",
  "Waiting area",
  "Covered parking",
  "Outdoor seating",
  "Pet friendly",
];


async function authenticateHost(
  request: Request
) {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization?.startsWith(
      "Bearer "
    )
  ) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  const idToken =
    authorization
      .slice("Bearer ".length)
      .trim();

  const decoded =
    await adminAuth.verifyIdToken(
      idToken
    );

  const userSnapshot =
    await adminDb
      .collection("users")
      .doc(decoded.uid)
      .get();

  const userData =
    userSnapshot.data();

  const roles =
    Array.isArray(userData?.roles)
      ? userData.roles
      : [];

  if (!roles.includes("host")) {
    throw new Error(
      "HOST_REQUIRED"
    );
  }

  return decoded;
}


async function getHostListing(
  uid: string
) {
  const snapshot =
    await adminDb
      .collection("hosts")
      .where(
        "ownerUid",
        "==",
        uid
      )
      .limit(1)
      .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0];
}


function publicListingPayload(
  listingId: string,
  data: FirebaseFirestore.DocumentData
) {
  const charger =
    data.charger &&
    typeof data.charger === "object"
      ? data.charger
      : {};

  const availability =
    data.availability &&
    typeof data.availability ===
      "object"
      ? data.availability
      : {};

  const pricing =
    data.pricing &&
    typeof data.pricing === "object"
      ? data.pricing
      : {};

  return {
    id: listingId,

    hostPublicName:
      String(
        data.hostPublicName ?? ""
      ),

    hostBio:
      String(
        data.hostBio ?? ""
      ),

    status:
      String(
        data.status ?? ""
      ),

    area:
      String(
        data.area ?? ""
      ),

    state:
      String(
        data.state ?? ""
      ),

    postalCode:
      String(
        data.postalCode ?? ""
      ),

    charger: {
      level:
        String(
          charger.level ?? ""
        ),

      connector:
        String(
          charger.connector ?? ""
        ),

      speed:
        String(
          charger.speed ?? ""
        ),
    },

    availability: {
      preferences:
        Array.isArray(
          availability.preferences
        )
          ? availability.preferences.filter(
              (
                value: unknown
              ): value is string =>
                typeof value ===
                "string"
            )
          : [],

      startTime:
        String(
          availability.startTime ??
            ""
        ),

      endTime:
        String(
          availability.endTime ??
            ""
        ),
    },

    access:
      String(
        data.access ?? ""
      ),

    amenities:
      Array.isArray(
        data.amenities
      )
        ? data.amenities.filter(
            (
              value: unknown
            ): value is string =>
              typeof value ===
              "string"
          )
        : [],

    rules:
      String(
        data.rules ?? ""
      ),

    bookingMode:
      String(
        data.bookingMode ?? ""
      ),

    pricing: {
      sessionPrice:
        Number(
          pricing.sessionPrice ??
            0
        ),

      currency:
        String(
          pricing.currency ??
            "USD"
        ),

      configured:
        pricing.configured ===
        true,
    },

    paymentsEnabled:
      data.paymentsEnabled ===
      true,

    rating:
      typeof data.rating ===
      "number"
        ? data.rating
        : null,

    reviews:
      typeof data.reviews ===
      "number"
        ? data.reviews
        : 0,
  };
}


export async function GET(
  request: Request
) {
  try {
    const decoded =
      await authenticateHost(
        request
      );

    const listing =
      await getHostListing(
        decoded.uid
      );

    if (!listing) {
      return NextResponse.json(
        {
          error:
            "Your active KIVO Host listing was not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,

      listing:
        publicListingPayload(
          listing.id,
          listing.data()
        ),

      options: {
        availability:
          AVAILABILITY_OPTIONS,

        amenities:
          AMENITY_OPTIONS,
      },
    });
  } catch (error) {
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
        { status: 401 }
      );
    }

    if (
      message ===
      "HOST_REQUIRED"
    ) {
      return NextResponse.json(
        {
          error:
            "An active KivoHost account is required.",
        },
        { status: 403 }
      );
    }

    console.error(
      "KIVO Host listing GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load your KIVO Host listing.",
      },
      { status: 500 }
    );
  }
}


export async function PATCH(
  request: Request
) {
  try {
    const decoded =
      await authenticateHost(
        request
      );

    const listing =
      await getHostListing(
        decoded.uid
      );

    if (!listing) {
      return NextResponse.json(
        {
          error:
            "Your active KIVO Host listing was not found.",
        },
        { status: 404 }
      );
    }

    const body =
      await request.json();

    const hostPublicName =
      String(
        body.hostPublicName ?? ""
      ).trim();

    const hostBio =
      String(
        body.hostBio ?? ""
      ).trim();

    const access =
      String(
        body.access ?? ""
      ).trim();

    const rules =
      String(
        body.rules ?? ""
      ).trim();

    const requestedAvailability =
      Array.isArray(
        body.availability
      )
        ? body.availability
            .filter(
              (
                value: unknown
              ): value is string =>
                typeof value ===
                "string"
            )
            .map(
              (value: string) =>
                value.trim()
            )
            .filter(Boolean)
        : [];

    const availability =
      requestedAvailability.filter(
        (value: string) =>
          AVAILABILITY_OPTIONS.includes(
            value
          )
      );

    const requestedAmenities =
      Array.isArray(
        body.amenities
      )
        ? body.amenities
            .filter(
              (
                value: unknown
              ): value is string =>
                typeof value ===
                "string"
            )
            .map(
              (value: string) =>
                value.trim()
            )
            .filter(Boolean)
        : [];

    /*
     * Preserve existing legitimate
     * marketplace amenities while also
     * supporting the canonical onboarding
     * choices.
     */
    const existingData =
      listing.data();

    const existingAmenities =
      Array.isArray(
        existingData.amenities
      )
        ? existingData.amenities.filter(
            (
              value: unknown
            ): value is string =>
              typeof value ===
              "string"
          )
        : [];

    const allowedAmenities =
      new Set([
        ...AMENITY_OPTIONS,
        ...existingAmenities,
      ]);

    const amenities =
      requestedAmenities.filter(
        (value: string) =>
          allowedAmenities.has(
            value
          )
      );

    if (!hostPublicName) {
      return NextResponse.json(
        {
          error:
            "Public Host name is required.",
        },
        { status: 400 }
      );
    }

    if (
      hostPublicName.length >
      80
    ) {
      return NextResponse.json(
        {
          error:
            "Public Host name is too long.",
        },
        { status: 400 }
      );
    }

    if (
      hostBio.length >
      500
    ) {
      return NextResponse.json(
        {
          error:
            "Host bio must be 500 characters or less.",
        },
        { status: 400 }
      );
    }

    if (
      access.length >
      300
    ) {
      return NextResponse.json(
        {
          error:
            "Access description must be 300 characters or less.",
        },
        { status: 400 }
      );
    }

    if (
      rules.length >
      500
    ) {
      return NextResponse.json(
        {
          error:
            "Charging rules must be 500 characters or less.",
        },
        { status: 400 }
      );
    }

    if (
      availability.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Choose at least one general availability window.",
        },
        { status: 400 }
      );
    }

    await listing.ref.set(
      {
        hostPublicName,
        hostBio,
        access,
        amenities,

        availability: {
          preferences:
            availability,
        },

        rules,

        updatedAt:
          FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const updated =
      await listing.ref.get();

    return NextResponse.json({
      ok: true,

      listing:
        publicListingPayload(
          updated.id,
          updated.data() ?? {}
        ),
    });
  } catch (error) {
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
        { status: 401 }
      );
    }

    if (
      message ===
      "HOST_REQUIRED"
    ) {
      return NextResponse.json(
        {
          error:
            "An active KivoHost account is required.",
        },
        { status: 403 }
      );
    }

    console.error(
      "KIVO Host listing PATCH error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to update your KIVO Host listing.",
      },
      { status: 500 }
    );
  }
}
