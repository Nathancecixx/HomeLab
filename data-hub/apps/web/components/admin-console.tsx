"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AppModule, Source, SourceGroup, SummaryProvider } from "@data-hub/contracts";

import { clientApiFetch } from "@/lib/client-api";

export function AdminConsole({
  groups,
  sources,
  providers,
  enabledModules,
}: {
  groups: SourceGroup[];
  sources: Source[];
  providers: SummaryProvider[];
  enabledModules: AppModule[];
}) {
  const router = useRouter();
  const [discoverUrl, setDiscoverUrl] = useState("");
  const [discovered, setDiscovered] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function discover(type: "rss" | "youtube" | "podcast") {
    setPending(true);
    setError(null);
    try {
      const adapterKey = type === "podcast" ? "podcast" : type === "youtube" ? "youtube" : "rss";
      const module = type === "podcast" ? "podcasts" : type === "youtube" ? "channels" : "news";
      const result = await clientApiFetch<Record<string, unknown>>("/api/v1/sources/discover", {
        method: "POST",
        body: JSON.stringify({
          url: discoverUrl,
          sourceType: type,
          adapterKey,
          module,
        }),
      });
      setDiscovered(result);
    } catch (discoverError) {
      setError(discoverError instanceof Error ? discoverError.message : "Unable to discover source.");
    } finally {
      setPending(false);
    }
  }

  async function createSource() {
    if (!discovered) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      await clientApiFetch("/api/v1/sources", {
        method: "POST",
        body: JSON.stringify({
          ...discovered,
          sourceTier: "standard",
          pollingMinutes: discovered.sourceType === "podcast" || discovered.sourceType === "youtube" ? 10 : 15,
          sourceGroupId: groups.find((group) => group.module === discovered.module)?.id ?? null,
        }),
      });
      setDiscovered(null);
      setDiscoverUrl("");
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create source.");
    } finally {
      setPending(false);
    }
  }

  async function toggleModule(module: AppModule) {
    const next = enabledModules.includes(module)
      ? enabledModules.filter((entry) => entry !== module)
      : [...enabledModules, module];
    await clientApiFetch("/api/v1/me/modules", {
      method: "PUT",
      body: JSON.stringify({ modules: next }),
    });
    router.refresh();
  }

  return (
    <div className="admin-grid">
      <section className="panel">
        <div className="panel__head">
          <div>
            <span className="eyebrow">Source Discovery</span>
            <h2>Add a feed or channel</h2>
          </div>
        </div>
        <label className="field">
          <span>Feed or Channel URL</span>
          <input value={discoverUrl} onChange={(event) => setDiscoverUrl(event.target.value)} placeholder="https://…" />
        </label>
        <div className="button-row">
          <button className="button" type="button" onClick={() => discover("rss")} disabled={pending}>
            Discover RSS
          </button>
          <button className="button" type="button" onClick={() => discover("youtube")} disabled={pending}>
            Discover YouTube
          </button>
          <button className="button" type="button" onClick={() => discover("podcast")} disabled={pending}>
            Discover Podcast
          </button>
        </div>
        {error ? <div className="feedback feedback--error">{error}</div> : null}
        {discovered ? (
          <div className="feature-card">
            <strong>{String(discovered.title)}</strong>
            <p>{String(discovered.description ?? "")}</p>
            <button className="button button--solid" type="button" onClick={createSource} disabled={pending}>
              Create Source
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel__head">
          <div>
            <span className="eyebrow">Modules</span>
            <h2>Enabled Sections</h2>
          </div>
        </div>
        <div className="chip-row">
          {(["inbox", "news", "channels", "podcasts", "saved"] as AppModule[]).map((module) => (
            <button
              key={module}
              type="button"
              className={`chip-button ${enabledModules.includes(module) ? "chip-button--active" : ""}`}
              onClick={() => toggleModule(module)}
            >
              {module}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <div>
            <span className="eyebrow">Providers</span>
            <h2>Summary Providers</h2>
          </div>
        </div>
        <div className="stack">
          {providers.map((provider) => (
            <div className="feature-card" key={provider.id}>
              <strong>{provider.label}</strong>
              <span>
                {provider.providerType} · {provider.model}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel panel--wide">
        <div className="panel__head">
          <div>
            <span className="eyebrow">Catalog</span>
            <h2>Shared Source Library</h2>
          </div>
        </div>
        <div className="source-grid">
          {sources.map((source) => (
            <div className="source-card" key={source.id}>
              <h3>{source.title}</h3>
              <p>{source.description ?? "No description available yet."}</p>
              <div className="chip-row">
                <span className="chip">{source.module}</span>
                <span className="chip">{source.sourceType}</span>
                <span className="chip">{source.group?.name ?? "Ungrouped"}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
