import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth";
import { readWolTargets, wakeTarget } from "@/lib/wol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { id } = await context.params;
  const wolState = await readWolTargets();
  const target = wolState.targets.find((item) => item.id === id);

  if (!target) {
    return NextResponse.json({ error: "Unknown Wake-on-LAN target." }, { status: 404 });
  }

  const result = await wakeTarget(target);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
