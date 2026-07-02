import { NextResponse } from "next/server";
import { getRuntimeEnvDiagnostics } from "@/lib/env/runtime";
import { isGooglePlacesConfiguredAsync } from "@/lib/env/google-places";
import { buildHealthReport } from "@/lib/monitoring/health";

/** Liveness probe — confirms the app process is running. */
export async function GET() {
  const report = buildHealthReport({ readiness: false });
  report.checks.googlePlacesConfigured = await isGooglePlacesConfiguredAsync();
  const runtime = await getRuntimeEnvDiagnostics();
  return NextResponse.json({ ...report, runtime });
}
