import { NextResponse } from "next/server";
import { isGooglePlacesConfiguredAsync } from "@/lib/env/google-places";
import { resolveGooglePlace } from "@/lib/maps/google-places-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "Missing place id" }, { status: 400 });
  }

  if (!(await isGooglePlacesConfiguredAsync())) {
    return NextResponse.json(
      { place: null, error: "google_places_not_configured" },
      { status: 503 },
    );
  }

  try {
    const place = await resolveGooglePlace(id);
    if (!place) {
      return NextResponse.json({ place: null, error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ place });
  } catch (err) {
    console.error("places/resolve-address error:", err);
    return NextResponse.json(
      { place: null, error: "resolve_failed" },
      { status: 502 },
    );
  }
}
