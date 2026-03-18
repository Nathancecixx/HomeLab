"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { FeedItem } from "@data-hub/contracts";

import { clientApiFetch } from "@/lib/client-api";

import { usePlayer } from "./player-provider";

export function FeedCard({ item }: { item: FeedItem }) {
  const router = useRouter();
  const { playItem } = usePlayer();
  const [showVideo, setShowVideo] = useState(false);
  const [busy, setBusy] = useState(false);

  async function patchState(patch: Record<string, boolean>) {
    setBusy(true);
    try {
      await clientApiFetch(`/api/v1/item-state/${item.id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function requestSummary() {
    setBusy(true);
    try {
      await clientApiFetch("/api/v1/summaries", {
        method: "POST",
        body: JSON.stringify({ itemId: item.id }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="feed-card">
      <div className="feed-card__meta">
        <span className={`status-dot ${item.state.isRead ? "status-dot--muted" : "status-dot--fresh"}`} />
        <span>{item.sourceTitle}</span>
        <span>{new Date(item.publishedAt).toLocaleString()}</span>
      </div>
      <h3>{item.title}</h3>
      {item.imageUrl ? <img src={item.imageUrl} alt="" className="feed-card__image" /> : null}
      <p>{item.excerpt ?? item.bodyText ?? "No summary available yet."}</p>
      <div className="chip-row">
        <span className="chip">{item.module}</span>
        <span className="chip">{item.itemType}</span>
        {item.matchReasons.map((reason) => (
          <span className="chip chip--accent" key={reason}>
            {reason}
          </span>
        ))}
      </div>
      <div className="button-row">
        <button className="button" type="button" onClick={() => patchState({ isRead: !item.state.isRead })} disabled={busy}>
          {item.state.isRead ? "Mark Unread" : "Mark Read"}
        </button>
        <button className="button" type="button" onClick={() => patchState({ isSaved: !item.state.isSaved })} disabled={busy}>
          {item.state.isSaved ? "Unsave" : "Save"}
        </button>
        <button className="button" type="button" onClick={requestSummary} disabled={busy}>
          Summarize
        </button>
        <button className="button button--ghost" type="button" onClick={() => patchState({ isHidden: !item.state.isHidden })} disabled={busy}>
          {item.state.isHidden ? "Show" : "Hide"}
        </button>
        {item.audioUrl ? (
          <button className="button button--solid" type="button" onClick={() => playItem(item)}>
            Play Audio
          </button>
        ) : null}
        {item.embedUrl ? (
          <button className="button button--solid" type="button" onClick={() => setShowVideo((value) => !value)}>
            {showVideo ? "Hide Video" : "Watch Here"}
          </button>
        ) : null}
        {item.siteUrl ? (
          <a className="button" href={item.siteUrl} target="_blank" rel="noreferrer">
            Open Source
          </a>
        ) : null}
      </div>
      {showVideo && item.embedUrl ? <iframe className="video-frame" src={item.embedUrl} title={item.title} allowFullScreen /> : null}
    </article>
  );
}
