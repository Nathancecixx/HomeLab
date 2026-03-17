import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth";
import { buildRuntimeStatus } from "@/lib/runtime-status";
import { getDashboardSnapshot } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const snapshot = await getDashboardSnapshot();
  const runtimeStatus = await buildRuntimeStatus({
    dockerError: snapshot.meta.dockerError,
    hostTelemetry: snapshot.meta.hostTelemetry,
  });
  return NextResponse.json({ services: snapshot.services, runtime: runtimeStatus });
}
