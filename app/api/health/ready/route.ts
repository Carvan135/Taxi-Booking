import { NextResponse } from "next/server";
import { buildHealthReport } from "@/lib/monitoring/health";

/** Readiness probe — returns 503 when critical dependencies are missing. */
export async function GET() {
  const report = buildHealthReport({ readiness: true });
  const status = report.status === "unhealthy" ? 503 : 200;
  return NextResponse.json(report, { status });
}
