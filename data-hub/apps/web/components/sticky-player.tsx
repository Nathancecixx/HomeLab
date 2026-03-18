"use client";

import { usePlayer } from "./player-provider";

export function StickyPlayer() {
  const { current, clear } = usePlayer();

  if (!current || !current.audioUrl) {
    return null;
  }

  const asset = current.mediaAssets.find((entry) => entry.kind === "audio" && entry.localUrl) ?? null;
  const audioUrl = asset?.localUrl ?? current.audioUrl;

  return (
    <div className="sticky-player">
      <div className="sticky-player__meta">
        <span className="eyebrow">Now Playing</span>
        <strong>{current.title}</strong>
        <span>{current.sourceTitle}</span>
      </div>
      <audio controls preload="metadata" src={audioUrl} className="sticky-player__audio" />
      <button type="button" className="button button--ghost" onClick={clear}>
        Dismiss
      </button>
    </div>
  );
}
