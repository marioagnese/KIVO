import { NextResponse } from "next/server";

import {
  adminAuth,
  adminDb,
  KIVO_ADMIN_EMAIL,
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
        { error: "Missing admin authorization." },
        { status: 401 }
      );
    }

    const token = authorization
      .slice("Bearer ".length)
      .trim();

    const decoded =
      await adminAuth.verifyIdToken(token);

    const adminEmail =
      decoded.email?.trim().toLowerCase();

    if (
      !adminEmail ||
      adminEmail !==
        KIVO_ADMIN_EMAIL.trim().toLowerCase()
    ) {
      return NextResponse.json(
        { error: "KIVO admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const uid = String(body.uid ?? "").trim();

    if (!uid) {
      return NextResponse.json(
        { error: "Driver UID is required." },
        { status: 400 }
      );
    }

    const ref = adminDb
      .collection("driverActivations")
      .doc(uid);

    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        {
          error:
            "Driver activation record was not found.",
        },
        { status: 404 }
      );
    }

    const activation =
      snapshot.data() ?? {};

    const driverEmail =
      String(
        activation.email ??
        ""
      )
        .trim()
        .toLowerCase();

    if (
      activation.identitySafety?.status !==
      "pending_verification"
    ) {
      return NextResponse.json(
        {
          error:
            "Driver verification must be pending first.",
        },
        { status: 400 }
      );
    }

    const profileComplete =
      activation.profile?.status === "complete";

    const legalComplete =
      activation.legal?.status === "complete";

    const bookingReady =
      profileComplete && legalComplete;

    await ref.set(
      {
        identitySafety: {
          ...activation.identitySafety,
          status: "verified",
          provider:
            "kivo_admin_test_bridge",
          verificationSessionId:
            "admin-test-verification",
          verifiedAt: new Date(),
          verifiedBy: adminEmail,
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

        updatedAt: new Date(),
      },
      { merge: true }
    );

    let readinessEmailSent = false;
    let readinessEmailWarning = "";

    if (
      bookingReady &&
      driverEmail
    ) {
      try {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL;

        if (!appUrl) {
          throw new Error(
            "KIVO application URL is not configured."
          );
        }

        await sendKivoEmail({
          to: driverEmail,
          subject:
            "You’re ready to drive with KIVO",
          eyebrow:
            "KIVODRIVER",
          title:
            "You’re ready to request charging sessions.",
          body:
            kivoParagraph(
              "Your Driver profile, agreement, and Identity & Safety verification are complete."
            ) +
            kivoParagraph(
              "You can now use KIVO to discover private neighborhood chargers and request real charging sessions from verified KIVO Hosts."
            ) +
            kivoParagraph(
              "A Host’s exact private address and arrival instructions remain protected until your charging request has been accepted."
            ),
          buttonLabel:
            "Find a KIVO charger",
          buttonUrl:
            appUrl.replace(/\/$/, ""),
          accent:
            "driver",
        });

        readinessEmailSent = true;

        await ref.set(
          {
            communications: {
              bookingReadyEmail: {
                status: "sent",
                sentAt: new Date(),
              },
            },
          },
          { merge: true }
        );
      } catch (emailError) {
        console.error(
          "KIVO Driver readiness email error:",
          emailError
        );

        readinessEmailWarning =
          emailError instanceof Error
            ? emailError.message
            : "Driver readiness email could not be sent.";

        await ref.set(
          {
            communications: {
              bookingReadyEmail: {
                status: "failed",
                attemptedAt: new Date(),
                error:
                  readinessEmailWarning,
              },
            },
          },
          { merge: true }
        );
      }
    }

    return NextResponse.json({
      ok: true,

      readinessEmailSent,
      readinessEmailWarning,

      identitySafety: {
        status: "verified",
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
    });
  } catch (error) {
    console.error(
      "Admin Driver verification failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to complete Driver test verification.",
      },
      { status: 500 }
    );
  }
}
