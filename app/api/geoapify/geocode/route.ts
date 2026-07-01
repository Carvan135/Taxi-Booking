import { NextResponse } from "next/server";
import { isGeoapifyConfigured } from "@/lib/env/geoapify";
import { geocode } from "@/lib/maps/geoapify-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? "").trim();
  if (text.length < 3) {
    return NextResponse.json({ place: null }, { status: 400 });
  }

  if (!isGeoapifyConfigured()) {
    console.error("geoapify/geocode: GEOAPIFY_API_KEY is not set");
    return NextResponse.json(
      { place: null, error: "geoapify_not_configured" },
      { status: 503 },
    );
  }

  try {
    const place = await geocode(text);
    return NextResponse.json({ place });
  } catch (err) {
    console.error("geoapify/geocode error:", err);
    return NextResponse.json(
      { place: null, error: "geoapify_request_failed" },
      { status: 502 },
    );
  }
}
