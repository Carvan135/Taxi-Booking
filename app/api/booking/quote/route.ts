import { NextResponse } from "next/server";
import { quoteBodySchema } from "@/lib/booking/api-schemas";
import { quoteOperatorTrip } from "@/lib/booking/quote-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = quoteBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { operator_id, trip } = parsed.data;

    const quote = await quoteOperatorTrip(operator_id, trip);
    if (!quote) {
      return NextResponse.json(
        { error: "Operator pricing not configured" },
        { status: 404 },
      );
    }

    return NextResponse.json(quote);
  } catch (err) {
    console.error("booking/quote error:", err);
    return NextResponse.json(
      { error: "Could not calculate quote" },
      { status: 500 },
    );
  }
}
