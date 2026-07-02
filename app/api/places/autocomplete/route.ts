import { NextResponse } from "next/server";
import { addressAutocomplete } from "@/lib/maps/address-autocomplete";
import { isGeoapifyConfigured } from "@/lib/env/geoapify";
import { isGooglePlacesConfiguredAsync } from "@/lib/env/google-places";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? "").trim();
  if (text.length < 2) {
    return NextResponse.json({ places: [], provider: "none" });
  }

  const googleConfigured = await isGooglePlacesConfiguredAsync();
  if (!googleConfigured && !isGeoapifyConfigured()) {
    console.error("places/autocomplete: no address provider configured");
    return NextResponse.json(
      { places: [], provider: "none", error: "address_provider_not_configured" },
      { status: 503 },
    );
  }

  try {
    const { places, provider, googleFailure } = await addressAutocomplete(text);
    return NextResponse.json({ places, provider, googleFailure });
  } catch (err) {
    console.error("places/autocomplete error:", err);
    return NextResponse.json(
      { places: [], provider: "none", error: "autocomplete_request_failed" },
      { status: 502 },
    );
  }
}
