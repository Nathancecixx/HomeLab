"use client";

import { useState } from "react";

import type { ThemeMode } from "@/lib/types";

function getCurrentTheme(): ThemeMode {
  if (typeof document === "undefined") {
    return "dark";
  }

  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() => getCurrentTheme());

  function apply(nextTheme: ThemeMode) {
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("dashboard-theme", nextTheme);
    setTheme(nextTheme);
  }

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="button button--ghost theme-button"
      onClick={() => apply(nextTheme)}
      aria-label={`Switch to ${nextTheme} theme`}
    >
      <span>Theme</span>
      <strong>{theme === "dark" ? "Dark" : "Light"}</strong>
    </button>
  );
}
