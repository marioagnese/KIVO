import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  kivoParagraph,
  sendKivoEmail,
} from "@/lib/kivoEmail";

export async function POST(request: Request) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "KIVO Driver authentication required." },
        { status: 401 }
      );
    }

    const token = authorization
      .slice("Bearer ".length)
      .trim();

    const decoded =
      await adminAuth.verifyIdToken(token);

    const driverEmail =
      decoded.email?.trim().toLowerCase();

    if (!driverEmail) {
      return NextResponse.json(
        { error: "A KIVO Driver email is required." },
        { status: 401 }
      );
    }

    const driverActivation =
      await adminDb
        .collection("driverActivations")
        .doc(decoded.uid)
        .get();

    if (
      !driverActivation.exists ||
      driverActivation.data()?.bookingReadiness?.status !==
        "complete"
    ) {
      return NextResponse.json(
        {
          error:
            "Complete your KIVO Driver setup before requesting a charging session.",
          setupRequired: true,
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const hostListingId =
      String(body.hostListingId ?? "").trim();

    const requestedDate =
      String(body.requestedDate ?? "").trim();

    const requestedTime =
      String(body.requestedTime ?? "").trim();

    const vehicleConnector =
      String(body.vehicleConnector ?? "").trim();

    if (
      !hostListingId ||
      !requestedDate ||
      !requestedTime ||
      !vehicleConnector
    ) {
      return NextResponse.json(
        { error: "Missing booking request information." },
        { status: 400 }
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        requestedDate
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Choose a valid charging date.",
        },
        { status: 400 }
      );
    }

    const [
      requestedYear,
      requestedMonth,
      requestedDay,
    ] =
      requestedDate
        .split("-")
        .map(Number);

    const requestedCalendarDate =
      new Date(
        requestedYear,
        requestedMonth - 1,
        requestedDay
      );

    if (
      requestedCalendarDate.getFullYear() !==
        requestedYear ||
      requestedCalendarDate.getMonth() !==
        requestedMonth - 1 ||
      requestedCalendarDate.getDate() !==
        requestedDay
    ) {
      return NextResponse.json(
        {
          error:
            "Choose a valid charging date.",
        },
        { status: 400 }
      );
    }

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    if (
      requestedCalendarDate <
      today
    ) {
      return NextResponse.json(
        {
          error:
            "Charging requests cannot be made for a past date.",
        },
        { status: 400 }
      );
    }

    const hostRef =
      adminDb.collection("hosts").doc(hostListingId);

    const hostSnapshot =
      await hostRef.get();

    if (!hostSnapshot.exists) {
      return NextResponse.json(
        { error: "This KIVO Host is no longer available." },
        { status: 404 }
      );
    }

    const host =
      hostSnapshot.data() ?? {};

    const hostUid =
      String(
        host.ownerUid ??
        host.uid ??
        ""
      ).trim();

    if (!hostUid) {
      return NextResponse.json(
        { error: "This Host listing is incomplete." },
        { status: 409 }
      );
    }

    if (
      host.status &&
      String(host.status).toLowerCase() !== "active"
    ) {
      return NextResponse.json(
        { error: "This KIVO Host is not currently active." },
        { status: 409 }
      );
    }

    if (hostUid === decoded.uid) {
      return NextResponse.json(
        {
          error:
            "You cannot request a charging session from your own Host listing.",
        },
        { status: 400 }
      );
    }

    const hostUser =
      await adminAuth.getUser(hostUid);

    const hostEmail =
      hostUser.email?.trim().toLowerCase() ?? "";

    const hostArea =
      String(
        host.area ??
        host.locationLabel ??
        body.hostArea ??
        "KIVO Host"
      ).trim();

    const hostState =
      String(
        host.state ??
        body.hostState ??
        ""
      ).trim();

    const hostName =
      String(
        host.hostName ??
        host.displayName ??
        host.name ??
        "KIVO Host"
      ).trim();

    const priceRaw =
      host.sessionPrice ??
      host.price ??
      body.price ??
      0;

    const price =
      Number.isFinite(Number(priceRaw))
        ? Number(priceRaw)
        : 0;

    /*
     * Snapshot the public charger details onto the booking.
     *
     * hosts/{listingId}.charger is a structured object:
     * {
     *   level,
     *   connector,
     *   speed
     * }
     *
     * Never String(host.charger) directly because that
     * produces "[object Object]".
     */
    const hostCharger =
      host.charger &&
      typeof host.charger === "object"
        ? host.charger as Record<
            string,
            unknown
          >
        : null;

    const chargerParts =
      hostCharger
        ? [
            hostCharger.level,
            hostCharger.connector,
          ]
            .map((value) =>
              String(
                value ?? ""
              ).trim()
            )
            .filter(Boolean)
        : [];

    const charger =
      chargerParts.length > 0
        ? chargerParts.join(" · ")
        : String(
            typeof host.charger ===
              "string"
              ? host.charger
              : body.charger ?? ""
          ).trim();

    const speed =
      String(
        hostCharger?.speed ??
          hostCharger?.power ??
          host.speed ??
          body.speed ??
          ""
      ).trim();

    const access =
      String(
        typeof host.access ===
          "string"
          ? host.access
          : body.access ?? ""
      ).trim();

    const ref =
      adminDb
        .collection("bookingRequests")
        .doc();

    await ref.set({
      status: "pending",

      driverUid:
        decoded.uid,

      driverEmail,

      hostUid,

      hostListingId,

      hostArea,
      hostState,

      requestedDate,
      requestedTime,
      vehicleConnector,

      price,
      currency: "USD",

      charger,
      speed,
      access,

      route: {
        from:
          String(body.route?.from ?? ""),
        fromRegion:
          String(body.route?.fromRegion ?? ""),
        to:
          String(body.route?.to ?? ""),
        toRegion:
          String(body.route?.toRegion ?? ""),
        miles:
          body.route?.miles ?? null,
        hours:
          body.route?.hours ?? null,
      },

      createdAt:
        FieldValue.serverTimestamp(),

      updatedAt:
        FieldValue.serverTimestamp(),

      communications: {
        driverRequestEmail: {
          status: "pending",
        },
        hostRequestEmail: {
          status: "pending",
        },
      },
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(
        /\/$/,
        ""
      );

    let driverEmailSent = false;
    let hostEmailSent = false;

    if (appUrl) {
      try {
        await sendKivoEmail({
          to: driverEmail,
          subject:
            "Your KIVO charging request was sent",
          eyebrow:
            "KIVODRIVER",
          title:
            "Your charging request is on its way.",
          body:
            kivoParagraph(
              `Your request for ${requestedDate} at ${requestedTime} has been sent to ${hostName} in ${hostArea}${hostState ? `, ${hostState}` : ""}.`
            ) +
            kivoParagraph(
              "The Host will review your request. KIVO will let you know when it is accepted or declined."
            ) +
            kivoParagraph(
              "The Host’s exact private charging address remains protected until the booking is accepted."
            ),
          buttonLabel:
            "View my charging requests",
          buttonUrl:
            appUrl,
          accent:
            "driver",
        });

        driverEmailSent = true;

        await ref.set(
          {
            communications: {
              driverRequestEmail: {
                status: "sent",
                sentAt:
                  FieldValue.serverTimestamp(),
              },
            },
          },
          { merge: true }
        );
      } catch (emailError) {
        console.error(
          "Driver booking request email failed:",
          emailError
        );
      }

      if (hostEmail) {
        try {
          await sendKivoEmail({
            to: hostEmail,
            subject:
              "New KIVO charging request",
            eyebrow:
              "KIVOHOST",
            title:
              "You have a new charging request.",
            body:
              kivoParagraph(
                `A KIVO Driver has requested a charging session for ${requestedDate} at ${requestedTime}.`
              ) +
              kivoParagraph(
                `Vehicle connector: ${vehicleConnector}.`
              ) +
              kivoParagraph(
                "Open KIVO to review the request and accept or decline it."
              ),
            buttonLabel:
              "Review charging request",
            buttonUrl:
              appUrl,
            accent:
              "host",
          });

          hostEmailSent = true;

          await ref.set(
            {
              communications: {
                hostRequestEmail: {
                  status: "sent",
                  sentAt:
                    FieldValue.serverTimestamp(),
                },
              },
            },
            { merge: true }
          );
        } catch (emailError) {
          console.error(
            "Host booking request email failed:",
            emailError
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      bookingRequestId: ref.id,
      status: "pending",
      emails: {
        driver: driverEmailSent,
        host: hostEmailSent,
      },
    });
  } catch (error) {
    console.error(
      "Create KIVO booking request failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to create the charging request.",
      },
      { status: 500 }
    );
  }
}
