import { NextResponse } from "next/server";

import { getSessionFromCookies } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionFromCookies();
  return NextResponse.json({
    authenticated: Boolean(session),
    session,
  });
}
