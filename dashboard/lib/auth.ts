import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { appConfig } from "@/lib/config";
import type { SessionPayload } from "@/lib/types";

const SESSION_COOKIE = "brp.session";

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return crypto.createHmac("sha256", appConfig.sessionSecret).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function createSessionToken(payload: SessionPayload) {
  const encoded = toBase64Url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function parseSessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [encoded, providedSignature] = token.split(".");
  if (!encoded || !providedSignature) {
    return null;
  }

  if (!safeEqual(sign(encoded), providedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as SessionPayload;
    if (payload.role !== "admin" || payload.exp * 1000 <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function verifyAdminPassword(password: string) {
  if (!appConfig.adminPasswordBcrypt) {
    return false;
  }

  return bcrypt.compare(password, appConfig.adminPasswordBcrypt);
}

export function createAdminSession() {
  const now = Math.floor(Date.now() / 1000);
  return createSessionToken({
    role: "admin",
    iat: now,
    exp: now + appConfig.sessionTtlSeconds,
  });
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  return parseSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireAdminSession() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return session;
}

export function attachSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: appConfig.secureCookies,
    sameSite: "strict",
    path: "/",
    maxAge: appConfig.sessionTtlSeconds,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: appConfig.secureCookies,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
