import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth";
import { readWolTargets } from "@/lib/wol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const targets = await readWolTargets();
  return NextResponse.json(targets);
}
