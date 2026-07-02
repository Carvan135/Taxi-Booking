import { NextResponse } from "next/server";
import { getRuntimeEnvDiagnostics } from "@/lib/env/runtime";
import { isGooglePlacesConfiguredAsync } from "@/lib/env/google-places";
import { probeGooglePlacesAutocomplete } from "@/lib/maps/google-places-server";
import { buildHealthReport } from "@/lib/monitoring/health";

/** Liveness probe — confirms the app process is running. */
export async function GET() {
  const report = buildHealthReport({ readiness: false });
  report.checks.googlePlacesConfigured = await isGooglePlacesConfiguredAsync();
  const runtime = await getRuntimeEnvDiagnostics();
  const googlePlacesProbe = report.checks.googlePlacesConfigured
    ? await probeGooglePlacesAutocomplete()
    : { ok: false, error: "not_configured" as const };
  return NextResponse.json({ ...report, runtime, googlePlacesProbe });
}
