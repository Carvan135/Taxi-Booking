import { NextResponse } from "next/server";
import { addressGeocode } from "@/lib/maps/address-autocomplete";
import { isGeoapifyConfigured } from "@/lib/env/geoapify";
import { isGooglePlacesConfiguredAsync } from "@/lib/env/google-places";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? "").trim();
  if (text.length < 3) {
    return NextResponse.json({ place: null }, { status: 400 });
  }

  const googleConfigured = await isGooglePlacesConfiguredAsync();
  if (!googleConfigured && !isGeoapifyConfigured()) {
    console.error("places/geocode: no address provider configured");
    return NextResponse.json(
      { place: null, error: "address_provider_not_configured" },
      { status: 503 },
    );
  }

  try {
    const { place, provider, googleFailure } = await addressGeocode(text);
    return NextResponse.json({ place, provider, googleFailure });
  } catch (err) {
    console.error("places/geocode error:", err);
    return NextResponse.json(
      { place: null, error: "geocode_request_failed" },
      { status: 502 },
    );
  }
}
