import { NextResponse } from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

type AccessBody = {
  leadId: string;
};

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing Host authorization." },
        { status: 401 }
      );
    }

    const idToken = authorization.slice("Bearer ".length).trim();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const authenticatedEmail =
      decodedToken.email?.trim().toLowerCase();

    if (!authenticatedEmail) {
      return NextResponse.json(
        { error: "Authenticated email is unavailable." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as AccessBody;
    const leadId = body.leadId?.trim();

    if (!leadId) {
      return NextResponse.json(
        { error: "Missing Founding Host invitation." },
        { status: 400 }
      );
    }

    const leadRef = adminDb.collection("foundingHostLeads").doc(leadId);
    const leadSnapshot = await leadRef.get();

    if (!leadSnapshot.exists) {
      return NextResponse.json(
        { error: "This Founding Host invitation was not found." },
        { status: 404 }
      );
    }

    const lead = leadSnapshot.data();

    if (!lead) {
      return NextResponse.json(
        { error: "This Founding Host invitation is unavailable." },
        { status: 404 }
      );
    }

    const invitedEmail = String(lead.email ?? "")
      .trim()
      .toLowerCase();

    if (
      invitedEmail !== authenticatedEmail ||
      lead.status !== "invited"
    ) {
      return NextResponse.json(
        { error: "This invitation is not valid for the signed-in account." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      lead: {
        id: leadSnapshot.id,
        name: String(lead.name ?? ""),
        email: invitedEmail,
        phone: String(lead.phone ?? ""),
        postalCode: String(lead.postalCode ?? ""),
        parkingSetup: String(lead.parkingSetup ?? ""),
        chargerStatus: String(lead.chargerStatus ?? ""),
      },
    });
  } catch (error) {
    console.error("KIVO Host onboarding access error:", error);

    return NextResponse.json(
      { error: "Unable to validate this Host invitation." },
      { status: 500 }
    );
  }
}
