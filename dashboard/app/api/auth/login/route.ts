import { NextResponse } from "next/server";

import { attachSessionCookie, createAdminSession, verifyAdminPassword } from "@/lib/auth";
import { appConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!appConfig.adminPasswordBcrypt) {
    return NextResponse.json(
      { error: "Admin access is disabled until ADMIN_PASSWORD_BCRYPT is configured." },
      { status: 503 }
    );
  }

  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const valid = await verifyAdminPassword(password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  attachSessionCookie(response, createAdminSession());
  return response;
}
