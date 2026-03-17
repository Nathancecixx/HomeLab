import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth";
import { runServiceAction } from "@/lib/docker";
import { getServiceById } from "@/lib/services";
import type { AdminAction } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_: Request, context: { params: Promise<{ id: string; action: string }> }) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { id, action } = await context.params;
  if (!["start", "stop", "restart"].includes(action)) {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const service = getServiceById(id);
  if (!service) {
    return NextResponse.json({ error: "Unknown service." }, { status: 404 });
  }
  if (!service.actions.includes(action as AdminAction)) {
    return NextResponse.json({ error: "This service does not support that action." }, { status: 400 });
  }

  const result = await runServiceAction(service, action as AdminAction);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
