import { NextResponse } from "next/server";
import { addressGeocode } from "@/lib/maps/address-autocomplete";
import { isGeoapifyConfigured } from "@/lib/env/geoapify";
import { isGooglePlacesConfigured } from "@/lib/env/google-places";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? "").trim();
  if (text.length < 3) {
    return NextResponse.json({ place: null }, { status: 400 });
  }

  if (!isGooglePlacesConfigured() && !isGeoapifyConfigured()) {
    console.error("address/geocode: no address provider configured");
    return NextResponse.json(
      { place: null, error: "address_provider_not_configured" },
      { status: 503 },
    );
  }

  try {
    const place = await addressGeocode(text);
    return NextResponse.json({ place });
  } catch (err) {
    console.error("address/geocode error:", err);
    return NextResponse.json(
      { place: null, error: "geocode_request_failed" },
      { status: 502 },
    );
  }
}
