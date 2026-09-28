import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      code: string;
    }>;
  },
) {
  const { code: rawCode } = await context.params;

  const code = decodeURIComponent(rawCode ?? "")
    .trim()
    .toUpperCase();

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin ||
    "https://www.kivocharge.com";

  if (!code) {
    return NextResponse.redirect(new URL("/host", baseUrl));
  }

  const snapshot = await adminDb.collection("referralCodes").doc(code).get();

  const data = snapshot.data() ?? {};

  if (!snapshot.exists || data.active !== true) {
    const destination = new URL("/host/apply", baseUrl);

    destination.searchParams.set("referral", "invalid");

    return NextResponse.redirect(destination);
  }

  const destination = new URL("/host/apply", baseUrl);

  destination.searchParams.set("utm_source", "founding_host");

  destination.searchParams.set("utm_medium", "referral");

  destination.searchParams.set("utm_campaign", "founding_host_referral");

  destination.searchParams.set("utm_content", code);

  return NextResponse.redirect(destination);
}
