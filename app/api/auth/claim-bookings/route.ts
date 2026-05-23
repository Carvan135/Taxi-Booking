import { NextResponse } from "next/server";
import { claimBookingsForAuthenticatedUser } from "@/lib/guest/claim-server";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await claimBookingsForAuthenticatedUser();

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ claimed: result.claimed });
}
