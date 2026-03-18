"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getClientApiBase } from "@/lib/client-api";

export function LiveStream() {
  const router = useRouter();
  const [label, setLabel] = useState("Listening for live updates");

  useEffect(() => {
    const source = new EventSource(`${getClientApiBase()}/api/v1/events`, { withCredentials: true });
    const handler = (event: MessageEvent<string>) => {
      const payload = JSON.parse(event.data) as { eventType?: string; payload?: { sourceId?: string; watchlistId?: string } };
      setLabel(payload.eventType ?? event.type);
      if (event.type !== "heartbeat") {
        router.refresh();
      }
    };

    source.addEventListener("item.created", handler);
    source.addEventListener("watchlist.match", handler);
    source.addEventListener("summary.completed", handler);
    source.addEventListener("cache.completed", handler);
    source.addEventListener("heartbeat", () => setLabel("Connected"));

    source.onerror = () => {
      setLabel("Reconnecting to live updates");
    };

    return () => {
      source.close();
    };
  }, [router]);

  return <div className="live-chip">{label}</div>;
}
