import { NextResponse } from "next/server";
import { addressAutocomplete } from "@/lib/maps/address-autocomplete";
import { isGeoapifyConfigured } from "@/lib/env/geoapify";
import { isGooglePlacesConfigured } from "@/lib/env/google-places";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? "").trim();
  if (text.length < 2) {
    return NextResponse.json({ places: [] });
  }

  if (!isGooglePlacesConfigured() && !isGeoapifyConfigured()) {
    console.error("address/autocomplete: no address provider configured");
    return NextResponse.json(
      { places: [], error: "address_provider_not_configured" },
      { status: 503 },
    );
  }

  try {
    const places = await addressAutocomplete(text);
    return NextResponse.json({ places });
  } catch (err) {
    console.error("address/autocomplete error:", err);
    return NextResponse.json(
      { places: [], error: "autocomplete_request_failed" },
      { status: 502 },
    );
  }
}
