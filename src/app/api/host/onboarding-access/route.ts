import { NextResponse } from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

type AccessBody = {
  leadId: string;
};

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
        { status: 401 }
      );
    }

    const idToken =
      authorization
        .slice("Bearer ".length)
        .trim();

    const decodedToken =
      await adminAuth.verifyIdToken(
        idToken
      );

    const authenticatedEmail =
      decodedToken.email
        ?.trim()
        .toLowerCase();

    if (!authenticatedEmail) {
      return NextResponse.json(
        {
          error:
            "Your KIVO account email is unavailable.",
        },
        { status: 401 }
      );
    }

    const body =
      (await request.json()) as AccessBody;

    const leadId =
      body.leadId?.trim();

    if (!leadId) {
      return NextResponse.json(
        {
          error:
            "Host signup reference is missing.",
        },
        { status: 400 }
      );
    }

    const leadSnapshot =
      await adminDb
        .collection(
          "foundingHostLeads"
        )
        .doc(leadId)
        .get();

    if (!leadSnapshot.exists) {
      return NextResponse.json(
        {
          error:
            "Host signup information was not found.",
        },
        { status: 404 }
      );
    }

    const lead =
      leadSnapshot.data() ?? {};

    const signupEmail =
      String(
        lead.email ?? ""
      )
        .trim()
        .toLowerCase();

    if (
      !signupEmail ||
      signupEmail !==
        authenticatedEmail
    ) {
      return NextResponse.json(
        {
          error:
            "This Host signup belongs to a different KIVO account.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,

      lead: {
        id:
          leadSnapshot.id,

        name:
          String(
            lead.name ?? ""
          ),

        email:
          signupEmail,

        phone:
          String(
            lead.phone ?? ""
          ),

        postalCode:
          String(
            lead.postalCode ?? ""
          ),

        parkingSetup:
          String(
            lead.parkingSetup ?? ""
          ),

        chargerStatus:
          String(
            lead.chargerStatus ?? ""
          ),
      },
    });
  } catch (error) {
    console.error(
      "KIVO Host onboarding access error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to open Host setup.",
      },
      { status: 500 }
    );
  }
}
