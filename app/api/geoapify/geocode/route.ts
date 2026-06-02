import { NextResponse } from "next/server";
import { geocode } from "@/lib/maps/geoapify-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? "").trim();
  if (text.length < 3) {
    return NextResponse.json({ place: null });
  }

  try {
    const place = await geocode(text);
    return NextResponse.json({ place });
  } catch (err) {
    console.error("geoapify/geocode error:", err);
    return NextResponse.json({ place: null }, { status: 200 });
  }
}

