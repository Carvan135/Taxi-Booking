import { NextResponse } from "next/server";
import { autocomplete } from "@/lib/maps/geoapify-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? "").trim();
  if (text.length < 2) {
    return NextResponse.json({ places: [] });
  }

  try {
    const places = await autocomplete(text);
    return NextResponse.json({ places });
  } catch (err) {
    console.error("geoapify/autocomplete error:", err);
    return NextResponse.json({ places: [] }, { status: 200 });
  }
}

