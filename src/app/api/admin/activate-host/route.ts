import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
  KIVO_ADMIN_EMAIL,
} from "@/lib/firebaseAdmin";

type Coordinates = {
  lng: number;
  lat: number;
};

async function geocodePublicArea(
  city: string,
  state: string,
  postalCode: string
): Promise<Coordinates> {
  const token =
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    throw new Error(
      "Mapbox token is not configured."
    );
  }

  /*
   * PRIVACY:
   *
   * Never geocode the Host's private street address
   * for the public marketplace listing.
   *
   * The public listing uses only city/state/ZIP so
   * map coordinates represent the general charging area.
   */
  const query = [
    city.trim(),
    state.trim().toUpperCase(),
    postalCode.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  if (!query) {
    throw new Error(
      "Public Host location is incomplete."
    );
  }

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
    `${encodeURIComponent(query)}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&limit=1` +
    `&country=US,CA` +
    `&types=postcode,place,locality,district`;

  const response =
    await fetch(url, {
      cache: "no-store",
    });

  if (!response.ok) {
    throw new Error(
      "KIVO could not resolve the Host's public map area."
    );
  }

  const data =
    await response.json();

  const center =
    data?.features?.[0]?.center;

  if (
    !Array.isArray(center) ||
    center.length < 2
  ) {
    throw new Error(
      `KIVO could not locate "${query}".`
    );
  }

  const lng =
    Number(center[0]);

  const lat =
    Number(center[1]);

  if (
    !Number.isFinite(lng) ||
    !Number.isFinite(lat)
  ) {
    throw new Error(
      "KIVO received invalid public map coordinates."
    );
  }

  return {
    lng,
    lat,
  };
}

export async function POST(
  request: Request
) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (
      !authorization?.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Missing admin authorization.",
        },
        { status: 401 }
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

    const adminEmail =
      decoded.email
        ?.trim()
        .toLowerCase();

    if (
      !adminEmail ||
      adminEmail !==
        KIVO_ADMIN_EMAIL
          .trim()
          .toLowerCase()
    ) {
      return NextResponse.json(
        {
          error:
            "KIVO admin access required.",
        },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const uid =
      String(body.uid ?? "").trim();

    if (!uid) {
      return NextResponse.json(
        {
          error:
            "Host UID is required.",
        },
        { status: 400 }
      );
    }

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
      String(
        onboarding.status ?? ""
      ) !== "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "Only an approved Host can be activated.",
        },
        { status: 409 }
      );
    }

    /*
     * FINAL READINESS CHECK
     *
     * Never trust the Admin UI alone.
     * Re-check every gate server-side.
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
      activation.status === "active" &&
      typeof activation.hostListingId ===
        "string" &&
      activation.hostListingId
    ) {
      return NextResponse.json({
        ok: true,
        alreadyActive: true,
        hostListingId:
          activation.hostListingId,
      });
    }

    const publicListing =
      activation.publicListing ?? {};

    const displayName =
      String(
        publicListing.displayName ??
          onboarding.name ??
          "KIVO Host"
      ).trim();

    const city =
      String(
        publicListing.city ?? ""
      ).trim();

    const state =
      String(
        publicListing.state ?? ""
      )
        .trim()
        .toUpperCase();

    const postalCode =
      String(
        publicListing.postalCode ??
          onboarding.postalCode ??
          ""
      ).trim();

    if (
      !displayName ||
      !city ||
      !state ||
      !postalCode
    ) {
      return NextResponse.json(
        {
          error:
            "The Host's public listing location is incomplete.",
        },
        { status: 409 }
      );
    }

    const coords =
      await geocodePublicArea(
        city,
        state,
        postalCode
      );

    const charger =
      onboarding.charger ?? {};

    const property =
      onboarding.property ?? {};

    const hosting =
      onboarding.hosting ?? {};

    const amenities =
      Array.isArray(
        publicListing.amenities
      )
        ? publicListing.amenities.filter(
            (
              value: unknown
            ): value is string =>
              typeof value === "string"
          )
        : [];

    /*
     * A deterministic-ish area label that does not
     * disclose the exact property address.
     */
    const area =
      `${city}, ${state}`;

    /*
     * Do not copy:
     *
     * - exact street address
     * - unit
     * - phone
     * - email
     * - private access notes
     * - property authority
     * - identity verification details
     * - raw onboarding record
     */
    const publicHostDocument = {
      ownerUid: uid,

      hostPublicName:
        displayName,

      hostBio: "",

      status: "active",

      area,

      state,

      postalCode,

      locationLabel: area,

      coords: {
        lng: coords.lng,
        lat: coords.lat,
      },

      charger: {
        level: "Level 2",

        connector:
          String(
            charger.connector ??
              "Unknown"
          ),

        speed:
          String(
            charger.power ??
              charger.speed ??
              "Unknown"
          ),
      },

      availability: {
        preferences:
          Array.isArray(
            hosting.availability
          )
            ? hosting.availability
            : [],

        startTime: "",
        endTime: "",
      },

      /*
       * Payments/pricing are deliberately not live yet.
       * The Driver mock can still exercise booking requests.
       */
      pricing: {
        sessionPrice: 0,
        currency: "USD",
        configured: false,
      },

      paymentsEnabled: false,

      bookingMode:
        "request_only",

      access:
        String(
          property.setup ??
            "Host property"
        ),

      amenities,

      rules: "",

      rating: null,

      reviews: 0,

      activationSource:
        "kivo_host_activation",

      updatedAt:
        FieldValue.serverTimestamp(),
    };

    /*
     * Use a transaction so retries cannot accidentally
     * create multiple marketplace listings.
     */
    const result =
      await adminDb.runTransaction(
        async (transaction) => {
          const latestActivationSnapshot =
            await transaction.get(
              activationRef
            );

          const latestActivation =
            latestActivationSnapshot.data() ??
            {};

          if (
            latestActivation.status ===
              "active" &&
            typeof latestActivation.hostListingId ===
              "string" &&
            latestActivation.hostListingId
          ) {
            return {
              hostListingId:
                latestActivation.hostListingId,
              alreadyActive: true,
            };
          }

          const existingListingId =
            typeof latestActivation
              .hostListingId === "string"
              ? latestActivation.hostListingId
              : "";

          const listingRef =
            existingListingId
              ? adminDb
                  .collection("hosts")
                  .doc(
                    existingListingId
                  )
              : adminDb
                  .collection("hosts")
                  .doc();

          transaction.set(
            listingRef,
            {
              ...publicHostDocument,

              createdAt:
                FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          transaction.set(
            activationRef,
            {
              status: "active",

              hostListingId:
                listingRef.id,

              activatedAt:
                FieldValue.serverTimestamp(),

              activatedByUid:
                decoded.uid,

              activatedByEmail:
                adminEmail,

              finalActivation: {
                status: "complete",

                completedAt:
                  FieldValue.serverTimestamp(),

                completedByUid:
                  decoded.uid,

                completedByEmail:
                  adminEmail,
              },

              updatedAt:
                FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          transaction.set(
            onboardingRef,
            {
              activationStatus:
                "active",

              activatedAt:
                FieldValue.serverTimestamp(),

              hostListingId:
                listingRef.id,

              updatedAt:
                FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          return {
            hostListingId:
              listingRef.id,
            alreadyActive: false,
          };
        }
      );

    return NextResponse.json({
      ok: true,

      alreadyActive:
        result.alreadyActive,

      hostListingId:
        result.hostListingId,

      status: "active",
    });
  } catch (error) {
    console.error(
      "KIVO final Host activation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to activate KIVO Host.",
      },
      { status: 500 }
    );
  }
}
