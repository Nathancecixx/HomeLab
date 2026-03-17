import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth";
import { readEnvFileSnapshot, writeEnvFile } from "@/lib/env";
import { getServiceById, getServicePaths } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { id } = await context.params;
  const service = getServiceById(id);
  if (!service) {
    return NextResponse.json({ error: "Unknown service." }, { status: 404 });
  }

  const { envPath } = getServicePaths(service);
  const snapshot = await readEnvFileSnapshot(envPath);
  return NextResponse.json(snapshot);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : null;
  if (text === null) {
    return NextResponse.json({ error: "text is required." }, { status: 400 });
  }

  const { id } = await context.params;
  const service = getServiceById(id);
  if (!service) {
    return NextResponse.json({ error: "Unknown service." }, { status: 404 });
  }

  try {
    const { envPath } = getServicePaths(service);
    await writeEnvFile(envPath, text);
    const snapshot = await readEnvFileSnapshot(envPath);
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to write env file." },
      { status: 500 }
    );
  }
}
