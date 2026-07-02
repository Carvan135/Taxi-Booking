import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchApprovedOperators } from "@/lib/booking/fetch-approved-operators";
import { normalizeBookingServiceType } from "@/lib/operator/fleet-vehicle-types";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  service_type: z.string().min(1).optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      service_type: url.searchParams.get("service_type")?.trim() || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const serviceType = parsed.data.service_type
      ? normalizeBookingServiceType(parsed.data.service_type)
      : undefined;

    const { operators, error } = await fetchApprovedOperators(serviceType);

    if (error) {
      return NextResponse.json({ error, operators: [] }, { status: 503 });
    }

    return NextResponse.json({ operators });
  } catch (err) {
    console.error("booking/operators error:", err);
    return NextResponse.json(
      { error: "Could not load operators", operators: [] },
      { status: 500 },
    );
  }
}
