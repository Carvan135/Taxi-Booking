import { NextResponse } from "next/server";
import { isGoogleMapsConfigured } from "@/lib/env/google-maps";
import { autocomplete } from "@/lib/maps/google-places-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? "").trim();
  const sessionToken = (searchParams.get("sessionToken") ?? "").trim() || undefined;

  if (text.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  if (!isGoogleMapsConfigured()) {
    console.error("places/autocomplete: GOOGLE_MAPS_API_KEY is not set");
    return NextResponse.json(
      { suggestions: [], error: "google_maps_not_configured" },
      { status: 503 },
    );
  }

  try {
    const suggestions = await autocomplete(text, sessionToken);
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("places/autocomplete error:", err);
    return NextResponse.json(
      { suggestions: [], error: "google_places_request_failed" },
      { status: 502 },
    );
  }
}
