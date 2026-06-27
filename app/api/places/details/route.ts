import { NextResponse } from "next/server";
import { isGoogleMapsConfigured } from "@/lib/env/google-maps";
import { getPlaceDetails } from "@/lib/maps/google-places-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placeId = (searchParams.get("placeId") ?? "").trim();
  const sessionToken = (searchParams.get("sessionToken") ?? "").trim() || undefined;

  if (!placeId) {
    return NextResponse.json({ place: null }, { status: 400 });
  }

  if (!isGoogleMapsConfigured()) {
    console.error("places/details: GOOGLE_MAPS_API_KEY is not set");
    return NextResponse.json(
      { place: null, error: "google_maps_not_configured" },
      { status: 503 },
    );
  }

  try {
    const place = await getPlaceDetails(placeId, sessionToken);
    return NextResponse.json({ place });
  } catch (err) {
    console.error("places/details error:", err);
    return NextResponse.json(
      { place: null, error: "google_places_request_failed" },
      { status: 502 },
    );
  }
}
