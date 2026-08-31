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

import {
  kivoParagraph,
  sendKivoEmail,
} from "@/lib/kivoEmail";


function clean(
  value: unknown
) {
  return String(
    value ?? ""
  ).trim();
}


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
          .slice(
            "Bearer ".length
          )
          .trim()
      );


    const body =
      await request.json();

    const requestId =
      clean(
        body.requestId
      );

    const arrivalInstructions =
      clean(
        body.arrivalInstructions
      );


    if (
      !requestId ||
      !arrivalInstructions
    ) {
      return NextResponse.json(
        {
          error:
            "Booking request ID and arrival instructions are required.",
        },
        {
          status: 400,
        }
      );
    }


    /*
     * Load the booking first.
     *
     * The signed-in Host must own the
     * accepted booking before any private
     * property information is accessed.
     */
    const bookingRef =
      adminDb
        .collection(
          "bookingRequests"
        )
        .doc(
          requestId
        );

    const bookingSnapshot =
      await bookingRef.get();


    if (
      !bookingSnapshot.exists
    ) {
      return NextResponse.json(
        {
          error:
            "Booking request not found.",
        },
        {
          status: 404,
        }
      );
    }


    const booking =
      bookingSnapshot.data() ??
      {};


    if (
      booking.hostUid !==
      decoded.uid
    ) {
      return NextResponse.json(
        {
          error:
            "This charging request belongs to another Host.",
        },
        {
          status: 403,
        }
      );
    }


    if (
      booking.status !==
      "accepted"
    ) {
      return NextResponse.json(
        {
          error:
            "Arrival details can only be shared for an accepted booking.",
        },
        {
          status: 409,
        }
      );
    }


    /*
     * The exact charging address is private
     * Host activation data.
     *
     * Never accept the charging address from
     * the browser. The server reads the
     * authoritative property belonging to the
     * authenticated Host.
     */
    const activationSnapshot =
      await adminDb
        .collection(
          "hostActivations"
        )
        .doc(
          decoded.uid
        )
        .get();


    if (
      !activationSnapshot.exists
    ) {
      return NextResponse.json(
        {
          error:
            "KIVO could not find your activated charging property.",
        },
        {
          status: 409,
        }
      );
    }


    const activation =
      activationSnapshot.data() ??
      {};

    const privateProperty =
      activation.privateProperty &&
      typeof activation.privateProperty ===
        "object"
        ? activation.privateProperty as Record<
            string,
            unknown
          >
        : null;


    if (
      !privateProperty
    ) {
      return NextResponse.json(
        {
          error:
            "Your private charging property is not available.",
        },
        {
          status: 409,
        }
      );
    }


    const streetAddress =
      clean(
        privateProperty.streetAddress
      );

    const unit =
      clean(
        privateProperty.unit
      );

    const city =
      clean(
        privateProperty.city
      );

    const state =
      clean(
        privateProperty.state
      );

    const postalCode =
      clean(
        privateProperty.postalCode
      );


    if (
      !streetAddress ||
      !city ||
      !state ||
      !postalCode
    ) {
      return NextResponse.json(
        {
          error:
            "Your KIVO charging property is missing required address information.",
        },
        {
          status: 409,
        }
      );
    }


    const streetLine =
      unit
        ? `${streetAddress}, ${unit}`
        : streetAddress;

    const privateAddress =
      `${streetLine}, ${city}, ${state} ${postalCode}`;


    /*
     * Only now is the private address copied
     * onto this specific accepted booking.
     *
     * This is the privacy handoff from:
     *
     * hostActivations (Host-private)
     *          ↓
     * accepted booking (Driver-authorized)
     */
    await bookingRef.set(
      {
        privateAddress,
        arrivalInstructions,

        arrivalDetailsSharedAt:
          FieldValue.serverTimestamp(),

        updatedAt:
          FieldValue.serverTimestamp(),
      },
      {
        merge: true,
      }
    );


    /*
     * Notify the Driver without ever putting
     * the private address into email.
     */
    let emailSent =
      false;

    if (
      booking.driverEmail
    ) {
      try {
        const appUrl =
          process.env
            .NEXT_PUBLIC_APP_URL
            ?.replace(
              /\/$/,
              ""
            );

        if (
          appUrl
        ) {
          await sendKivoEmail({
            to:
              String(
                booking.driverEmail
              ),

            subject:
              "Your KIVO arrival details are ready",

            eyebrow:
              "KIVODRIVER",

            title:
              "Your Host has shared your arrival details.",

            body:
              kivoParagraph(
                "The private charging address and arrival instructions for your accepted session are now available securely inside KIVO."
              ) +
              kivoParagraph(
                "For Host privacy, KIVO does not include the private address in this email."
              ),

            buttonLabel:
              "View arrival details",

            buttonUrl:
              appUrl,

            accent:
              "driver",
          });

          emailSent =
            true;
        }
      } catch (
        emailError
      ) {
        console.error(
          "Arrival details email failed:",
          emailError
        );
      }
    }


    return NextResponse.json({
      ok: true,
      emailSent,
    });
  } catch (
    error
  ) {
    console.error(
      "Save KIVO arrival details failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to save arrival details.",
      },
      {
        status: 500,
      }
    );
  }
}
