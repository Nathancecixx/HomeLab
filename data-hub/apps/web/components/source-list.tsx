"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Source } from "@data-hub/contracts";

import { clientApiFetch } from "@/lib/client-api";

export function SourceList({ sources }: { sources: Source[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleFollow(source: Source) {
    setBusyId(source.id);
    try {
      if (source.isFollowing) {
        await clientApiFetch(`/api/v1/sources/${source.id}/unfollow`, {
          method: "POST",
          body: JSON.stringify({}),
        });
      } else {
        await clientApiFetch(`/api/v1/sources/${source.id}/follow`, {
          method: "POST",
          body: JSON.stringify({ folder: source.group?.name ?? "Following" }),
        });
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="source-grid">
      {sources.map((source) => (
        <article className="source-card" key={source.id}>
          <div className="feed-card__meta">
            <span>{source.module}</span>
            <span>{source.sourceType}</span>
            <span>{source.sourceTier}</span>
          </div>
          <h3>{source.title}</h3>
          <p>{source.description ?? "No description available yet."}</p>
          <div className="chip-row">
            <span className={`chip ${source.isFollowing ? "chip--accent" : ""}`}>{source.isFollowing ? "Following" : "Available"}</span>
            {source.group ? <span className="chip">{source.group.name}</span> : null}
          </div>
          <div className="button-row">
            <button className="button button--solid" type="button" onClick={() => toggleFollow(source)} disabled={busyId === source.id}>
              {source.isFollowing ? "Unfollow" : "Follow"}
            </button>
            <a className="button" href={source.siteUrl ?? source.feedUrl} target="_blank" rel="noreferrer">
              Open
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
