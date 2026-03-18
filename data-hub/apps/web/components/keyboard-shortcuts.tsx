"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const routes: Record<string, string> = {
  i: "/",
  n: "/newsroom",
  c: "/channels",
  p: "/podcasts",
  s: "/saved",
  t: "/settings",
  a: "/admin",
};

export function KeyboardShortcuts() {
  const router = useRouter();
  const awaiting = useRef(false);

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.matches("input, textarea")) {
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        document.getElementById("global-search")?.focus();
        return;
      }

      if (awaiting.current) {
        awaiting.current = false;
        const nextRoute = routes[event.key.toLowerCase()];
        if (nextRoute) {
          router.push(nextRoute);
        }
        return;
      }

      if (event.key.toLowerCase() === "g") {
        awaiting.current = true;
        window.setTimeout(() => {
          awaiting.current = false;
        }, 600);
      }
    };

    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [router]);

  return null;
}
