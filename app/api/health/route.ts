import { NextResponse } from "next/server";
import { buildHealthReport } from "@/lib/monitoring/health";

/** Liveness probe — confirms the app process is running. */
export async function GET() {
  const report = buildHealthReport({ readiness: false });
  return NextResponse.json(report);
}
