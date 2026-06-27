import { NextResponse } from "next/server";
import { isGoogleMapsConfigured } from "@/lib/env/google-maps";
import { geocode } from "@/lib/maps/google-places-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? "").trim();

  if (text.length < 3) {
    return NextResponse.json({ place: null }, { status: 400 });
  }

  if (!isGoogleMapsConfigured()) {
    console.error("places/geocode: GOOGLE_MAPS_API_KEY is not set");
    return NextResponse.json(
      { place: null, error: "google_maps_not_configured" },
      { status: 503 },
    );
  }

  try {
    const place = await geocode(text);
    return NextResponse.json({ place });
  } catch (err) {
    console.error("places/geocode error:", err);
    return NextResponse.json(
      { place: null, error: "google_places_request_failed" },
      { status: 502 },
    );
  }
}
