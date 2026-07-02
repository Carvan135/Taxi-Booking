import { appendFileSync } from "fs";
import { join } from "path";

const SESSION_ID = "681481";
const LOG_PATH = join(process.cwd(), "debug-681481.log");
const INGEST_URL =
  "http://127.0.0.1:7783/ingest/31707f6b-a011-4d5a-bc34-e330e2d7fed8";

type AgentLogPayload = {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
  runId?: string;
};

/** Debug-mode logging: append NDJSON locally and POST to ingest when available. */
export function agentLog(payload: AgentLogPayload): void {
  const entry = {
    sessionId: SESSION_ID,
    timestamp: Date.now(),
    ...payload,
  };
  const line = `${JSON.stringify(entry)}\n`;
  try {
    appendFileSync(LOG_PATH, line, "utf8");
  } catch {
    // ignore fs errors (e.g. read-only FS on Workers)
  }
  fetch(INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": SESSION_ID,
    },
    body: JSON.stringify(entry),
  }).catch(() => {});
}
