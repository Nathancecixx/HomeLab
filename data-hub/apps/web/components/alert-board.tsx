"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AlertIncident } from "@data-hub/contracts";

import { clientApiFetch } from "@/lib/client-api";

import { FeedCard } from "./feed-card";

export function AlertBoard({ incidents }: { incidents: AlertIncident[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function summarizeWatchlist(watchlistId: string) {
    setBusyId(watchlistId);
    try {
      await clientApiFetch("/api/v1/summaries", {
        method: "POST",
        body: JSON.stringify({ watchlistId }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="stack">
      {incidents.map((incident) => (
        <section className="panel" key={incident.clusterKey}>
          <div className="panel__head">
            <div>
              <span className="eyebrow">{incident.watchlistName}</span>
              <h2>{incident.clusterLabel}</h2>
              <p>
                First seen {new Date(incident.firstSeenAt).toLocaleString()} · Latest update {new Date(incident.latestSeenAt).toLocaleString()}
              </p>
            </div>
            <div className="button-row">
              <span className="chip chip--accent">{incident.corroboratingSources.length} sources</span>
              <button className="button" type="button" onClick={() => summarizeWatchlist(incident.watchlistId)} disabled={busyId === incident.watchlistId}>
                Summarize Watchlist
              </button>
            </div>
          </div>
          <div className="feed-grid">
            {incident.items.map((item) => (
              <FeedCard item={item} key={item.id} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
