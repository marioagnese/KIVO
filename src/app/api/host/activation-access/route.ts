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
        { error: "Missing activation authorization." },
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

    if (
      !authenticatedEmail ||
      decodedToken.email_verified !== true
    ) {
      return NextResponse.json(
        {
          error:
            "A verified KIVO account email is required.",
        },
        { status: 401 }
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
        {
          error:
            "Approved Host setup was not found.",
        },
        { status: 404 }
      );
    }

    const onboarding =
      onboardingSnapshot.data();

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

    if (!activationSnapshot.exists) {
      return NextResponse.json(
        {
          error:
            "Host activation has not been initialized.",
        },
        { status: 404 }
      );
    }

    const activation =
      activationSnapshot.data();

    if (!activation) {
      return NextResponse.json(
        {
          error:
            "Host activation record is unavailable.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,

      host: {
        uid,
        name:
          String(onboarding.name ?? ""),
        email:
          approvedEmail,
        phone:
          String(onboarding.phone ?? ""),
        postalCode:
          String(onboarding.postalCode ?? ""),
      },

      existingSetup: {
        charger:
          onboarding.charger ?? {},
        property:
          onboarding.property ?? {},
        hosting:
          onboarding.hosting ?? {},
        photos:
          onboarding.photos ?? {},
      },

      activation: {
        status:
          String(
            activation.status ??
              "activation_in_progress"
          ),

        account: {
          passwordConfigured:
            activation.account?.passwordConfigured === true,
        },

        propertyConfirmation: {
          streetAddress:
            String(
              activation.privateProperty?.streetAddress ?? ""
            ),
          unit:
            String(
              activation.privateProperty?.unit ?? ""
            ),
          city:
            String(
              activation.privateProperty?.city ?? ""
            ),
          state:
            String(
              activation.privateProperty?.state ?? ""
            ),
          postalCode:
            String(
              activation.privateProperty?.postalCode ?? ""
            ),
          authority:
            String(
              activation.privateProperty?.authority ?? ""
            ),
          privateAccessNotes:
            String(
              activation.privateProperty?.privateAccessNotes ?? ""
            ),
          chargingLocationConfirmed:
            activation.privateProperty
              ?.chargingLocationConfirmed === true,
          hostingAuthorityConfirmed:
            activation.privateProperty
              ?.hostingAuthorityConfirmed === true,
        },

        chargerConfirmation: {
          informationConfirmed:
            activation.chargerConfirmation
              ?.informationConfirmed === true,
          operationalConfirmed:
            activation.chargerConfirmation
              ?.operationalConfirmed === true,
        },

        identitySafety: {
          status:
            String(
              activation.identitySafety?.status ??
                "not_started"
            ),
          identityInformationConfirmed:
            activation.identitySafety
              ?.identityInformationConfirmed === true,
          consentToVerification:
            activation.identitySafety
              ?.consentToVerification === true,
          provider:
            String(
              activation.identitySafety?.provider ??
                ""
            ),
        },

        publicListing: {
          displayName:
            String(
              activation.publicListing?.displayName ?? ""
            ),
          city:
            String(
              activation.publicListing?.city ?? ""
            ),
          state:
            String(
              activation.publicListing?.state ?? ""
            ),
          postalCode:
            String(
              activation.publicListing?.postalCode ?? ""
            ),
          amenities:
            Array.isArray(
              activation.publicListing?.amenities
            )
              ? activation.publicListing.amenities
              : [],
          publicInformationConfirmed:
            activation.publicListing
              ?.publicInformationConfirmed === true,
          addressPrivacyAcknowledged:
            activation.publicListing
              ?.addressPrivacyAcknowledged === true,
        },

        gates: {
          safety: {
            status:
              String(
                activation.gates?.safety?.status ??
                  "not_started"
              ),
          },

          propertyAccess: {
            status:
              String(
                activation.gates?.propertyAccess?.status ??
                  "not_started"
              ),
          },

          charger: {
            status:
              String(
                activation.gates?.charger?.status ??
                  "not_started"
              ),
          },

          legal: {
            status:
              String(
                activation.gates?.legal?.status ??
                  "not_started"
              ),
          },

          listing: {
            status:
              String(
                activation.gates?.listing?.status ??
                  "not_started"
              ),
          },

          payouts: {
            status:
              String(
                activation.gates?.payouts?.status ??
                  "not_started"
              ),
          },
        },

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
      "KIVO Host activation access error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to validate KIVO Host activation access.",
      },
      { status: 500 }
    );
  }
}
