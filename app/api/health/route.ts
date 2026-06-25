import { NextResponse } from "next/server";
import { getRuntimeEnvDiagnostics } from "@/lib/env/runtime";
import { buildHealthReport } from "@/lib/monitoring/health";

/** Liveness probe — confirms the app process is running. */
export async function GET() {
  const report = buildHealthReport({ readiness: false });
  const runtime = await getRuntimeEnvDiagnostics();
  return NextResponse.json({ ...report, runtime });
}
