import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type {
  AppModule,
  AgentToken,
  AlertIncident,
  FeedPage,
  Session,
  Source,
  SourceGroup,
  Summary,
  SummaryProvider,
  Watchlist,
} from "@data-hub/contracts";

const INTERNAL_API_BASE = process.env.DATA_HUB_INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8184";

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("dh_session");
  const response = await fetch(`${INTERNAL_API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.headers ?? {}),
      ...(sessionToken ? { cookie: `dh_session=${sessionToken.value}` } : {}),
    },
  });

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    throw new Error(`API request failed for ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getSessionOrNull() {
  try {
    const response = await apiRequest<{ user: Session["user"] | null; scopes?: string[]; authenticatedAt?: string }>("/api/v1/auth/session");
    return response.user
      ? ({
          user: response.user,
          scopes: response.scopes ?? [],
          authenticatedAt: response.authenticatedAt ?? new Date().toISOString(),
        } satisfies Session)
      : null;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return null;
    }

    throw error;
  }
}

export async function requireSession() {
  const session = await getSessionOrNull();
  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

export async function getFeed(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }

  return apiRequest<FeedPage>(`/api/v1/feed?${search.toString()}`);
}

export async function searchFeed(query: string, params: Record<string, string | number | boolean | undefined> = {}) {
  return getFeed({
    ...params,
    query,
  });
}

export async function getSources(module?: string) {
  return apiRequest<Source[]>(`/api/v1/sources${module ? `?module=${encodeURIComponent(module)}` : ""}`);
}

export async function getSourceGroups() {
  return apiRequest<SourceGroup[]>("/api/v1/source-groups");
}

export async function getWatchlists() {
  return apiRequest<Watchlist[]>("/api/v1/watchlists");
}

export async function getAlerts() {
  return apiRequest<AlertIncident[]>("/api/v1/alerts");
}

export async function getSummaryProviders() {
  return apiRequest<SummaryProvider[]>("/api/v1/summaries/providers");
}

export async function getSummaries() {
  return apiRequest<Summary[]>("/api/v1/summaries");
}

export async function getAgentTokens() {
  return apiRequest<AgentToken[]>("/api/v1/me/tokens");
}

export async function getEnabledModules() {
  return apiRequest<AppModule[]>("/api/v1/me/modules");
}

export function getPublicApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8184";
}
