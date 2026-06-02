import { NextResponse } from "next/server";
import { quotesBatchBodySchema } from "@/lib/booking/api-schemas";
import {
  fetchOperatorQuoteData,
  quoteOperatorTripWithData,
  type QuoteRequestTrip,
} from "@/lib/booking/quote-server";
import { getCommissionPercentage } from "@/lib/booking/platform-settings-server";
import { OPERATOR_STATUS } from "@/lib/validations/enums";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { ServiceType } from "@/lib/validations/enums";
import type { VehicleType } from "@/types";

const SERVICE_TYPE_TO_VEHICLE_TYPE: Record<ServiceType, VehicleType> = {
  standard: "Sedan",
  executive: "Executive",
  van: "Van",
  suv: "SUV",
};

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = quotesBatchBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { service_type, trip } = parsed.data;

    const supabase = tryCreateAdminClient();
    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Quotes are unavailable: SUPABASE_SERVICE_ROLE_KEY is not set on the server.",
        },
        { status: 503 },
      );
    }

    const commissionPercent = await getCommissionPercentage();

    let query = supabase
      .from("operators")
      .select("id")
      .eq("status", OPERATOR_STATUS.approved)
      .eq("is_paused", false);

    if (service_type) {
      query = query.eq(
        "vehicle_type",
        SERVICE_TYPE_TO_VEHICLE_TYPE[service_type],
      );
    }

    const { data: operators, error } = await query;
    if (error) {
      console.error("booking/quotes operators query:", error);
      return NextResponse.json(
        {
          error: "Could not load operators for quoting",
          ...(process.env.NODE_ENV === "development"
            ? {
                details: error.message,
                hint: error.message.includes("is_paused")
                  ? "Apply migration 019 (operators.is_paused)."
                  : undefined,
              }
            : {}),
        },
        { status: 500 },
      );
    }

    const quotes: Record<
      string,
      Awaited<ReturnType<typeof quoteOperatorTripWithData>>
    > = {};

    await Promise.all(
      (operators ?? []).map(async (op) => {
        const { pricing, rules } = await fetchOperatorQuoteData(op.id);
        if (!pricing) return;
        quotes[op.id] = await quoteOperatorTripWithData(
          pricing,
          rules,
          trip as QuoteRequestTrip,
          commissionPercent,
          op.id,
        );
      }),
    );

    return NextResponse.json({ quotes });
  } catch (err) {
    console.error("booking/quotes error:", err);
    return NextResponse.json(
      {
        error: "Could not calculate quotes",
        ...(process.env.NODE_ENV === "development" && err instanceof Error
          ? { details: err.message }
          : {}),
      },
      { status: 500 },
    );
  }
}
