import { NextResponse } from "next/server";
import { route } from "@/lib/maps/geoapify-server";

export const dynamic = "force-dynamic";

type Body = {
  pickup?: { lat?: number; lng?: number };
  dropoff?: { lat?: number; lng?: number };
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pickup = body.pickup;
  const dropoff = body.dropoff;
  if (
    !pickup ||
    !dropoff ||
    !isFiniteNumber(pickup.lat) ||
    !isFiniteNumber(pickup.lng) ||
    !isFiniteNumber(dropoff.lat) ||
    !isFiniteNumber(dropoff.lng)
  ) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const result = await route(
      { lat: pickup.lat, lng: pickup.lng },
      { lat: dropoff.lat, lng: dropoff.lng },
    );
    return NextResponse.json({ result });
  } catch (err) {
    console.error("geoapify/route error:", err);
    return NextResponse.json({ error: "Route failed" }, { status: 500 });
  }
}

