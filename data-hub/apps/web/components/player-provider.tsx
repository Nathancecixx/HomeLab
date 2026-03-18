"use client";

import { createContext, useContext, useState } from "react";

import type { FeedItem } from "@data-hub/contracts";

const PlayerContext = createContext<{
  current: FeedItem | null;
  playItem: (item: FeedItem) => void;
  clear: () => void;
} | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<FeedItem | null>(null);

  const value = {
    current,
    playItem: (item: FeedItem) => setCurrent(item),
    clear: () => setCurrent(null),
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) {
    throw new Error("Player context is unavailable.");
  }

  return value;
}
