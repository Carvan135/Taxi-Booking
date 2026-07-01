import { NextResponse } from "next/server";
import { isGeoapifyConfigured } from "@/lib/env/geoapify";
import { autocomplete } from "@/lib/maps/geoapify-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? "").trim();
  if (text.length < 2) {
    return NextResponse.json({ places: [] });
  }

  if (!isGeoapifyConfigured()) {
    console.error("geoapify/autocomplete: GEOAPIFY_API_KEY is not set");
    return NextResponse.json(
      { places: [], error: "geoapify_not_configured" },
      { status: 503 },
    );
  }

  try {
    const places = await autocomplete(text);
    return NextResponse.json({ places });
  } catch (err) {
    console.error("geoapify/autocomplete error:", err);
    return NextResponse.json(
      { places: [], error: "geoapify_request_failed" },
      { status: 502 },
    );
  }
}
