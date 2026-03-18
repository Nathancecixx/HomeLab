"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AgentToken, Summary, Watchlist } from "@data-hub/contracts";

import { clientApiFetch } from "@/lib/client-api";

export function SettingsConsole({
  watchlists,
  tokens,
  summaries,
}: {
  watchlists: Watchlist[];
  tokens: AgentToken[];
  summaries: Summary[];
}) {
  const router = useRouter();
  const [watchlistName, setWatchlistName] = useState("");
  const [watchlistRule, setWatchlistRule] = useState("");
  const [tokenLabel, setTokenLabel] = useState("Local agent");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [selectedWatchlist, setSelectedWatchlist] = useState<string | null>(watchlists[0]?.id ?? null);

  async function createWatchlist() {
    const created = await clientApiFetch<Watchlist>("/api/v1/watchlists", {
      method: "POST",
      body: JSON.stringify({ name: watchlistName, description: "Created from the settings console." }),
    });

    setSelectedWatchlist(created.id);
    if (watchlistRule) {
      await clientApiFetch(`/api/v1/watchlists/${created.id}/rules`, {
        method: "POST",
        body: JSON.stringify({ ruleType: "keyword", pattern: watchlistRule }),
      });
    }

    setWatchlistName("");
    setWatchlistRule("");
    router.refresh();
  }

  async function createToken() {
    const payload = await clientApiFetch<{ rawToken: string }>("/api/v1/me/tokens", {
      method: "POST",
      body: JSON.stringify({ label: tokenLabel }),
    });
    setNewToken(payload.rawToken);
    router.refresh();
  }

  async function addRule() {
    if (!selectedWatchlist || !watchlistRule) {
      return;
    }

    await clientApiFetch(`/api/v1/watchlists/${selectedWatchlist}/rules`, {
      method: "POST",
      body: JSON.stringify({ ruleType: "keyword", pattern: watchlistRule }),
    });
    setWatchlistRule("");
    router.refresh();
  }

  return (
    <div className="admin-grid">
      <section className="panel">
        <div className="panel__head">
          <div>
            <span className="eyebrow">Watchlists</span>
            <h2>Create a monitoring lens</h2>
          </div>
        </div>
        <label className="field">
          <span>Watchlist name</span>
          <input value={watchlistName} onChange={(event) => setWatchlistName(event.target.value)} placeholder="Breaking cyber incidents" />
        </label>
        <label className="field">
          <span>First keyword rule</span>
          <input value={watchlistRule} onChange={(event) => setWatchlistRule(event.target.value)} placeholder="ransomware" />
        </label>
        <button className="button button--solid" type="button" onClick={createWatchlist} disabled={!watchlistName}>
          Create Watchlist
        </button>
        <div className="stack">
          {watchlists.map((watchlist) => (
            <div className="feature-card" key={watchlist.id}>
              <strong>{watchlist.name}</strong>
              <span>{watchlist.rules.map((rule) => rule.pattern).join(", ") || "No rules yet"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <div>
            <span className="eyebrow">Rules</span>
            <h2>Add to an existing watchlist</h2>
          </div>
        </div>
        <label className="field">
          <span>Target watchlist</span>
          <select value={selectedWatchlist ?? ""} onChange={(event) => setSelectedWatchlist(event.target.value)}>
            {watchlists.map((watchlist) => (
              <option value={watchlist.id} key={watchlist.id}>
                {watchlist.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Keyword</span>
          <input value={watchlistRule} onChange={(event) => setWatchlistRule(event.target.value)} placeholder="YouTube, podcast, or news term" />
        </label>
        <button className="button" type="button" onClick={addRule} disabled={!selectedWatchlist || !watchlistRule}>
          Add Rule
        </button>
      </section>

      <section className="panel">
        <div className="panel__head">
          <div>
            <span className="eyebrow">Agent Access</span>
            <h2>Read/search tokens</h2>
          </div>
        </div>
        <label className="field">
          <span>Token label</span>
          <input value={tokenLabel} onChange={(event) => setTokenLabel(event.target.value)} />
        </label>
        <button className="button button--solid" type="button" onClick={createToken}>
          Create Token
        </button>
        {newToken ? <div className="feedback feedback--accent">{newToken}</div> : null}
        <div className="stack">
          {tokens.map((token) => (
            <div className="feature-card" key={token.id}>
              <strong>{token.label}</strong>
              <span>{token.scopes.join(", ")}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel panel--wide">
        <div className="panel__head">
          <div>
            <span className="eyebrow">Summaries</span>
            <h2>Recent AI output</h2>
          </div>
        </div>
        <div className="stack">
          {summaries.map((summary) => (
            <div className="feature-card" key={summary.id}>
              <strong>{summary.watchlistId ? `Watchlist ${summary.watchlistId}` : `Item ${summary.itemId}`}</strong>
              <span>{summary.providerLabel ?? "Pending provider"}</span>
              <p>{summary.summaryText ?? summary.error ?? "Waiting for the worker to finish."}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
