import type { ReactNode } from "react";

import type { Tone } from "@/lib/view-model";

type CommandBarItem = {
  label: string;
  value: string;
  tone?: Tone;
};

type CommandBarProps = {
  mark: string;
  title: string;
  status?: {
    label: string;
    tone?: Tone;
  };
  items: CommandBarItem[];
  actions?: ReactNode;
};

export function CommandBar({ mark, title, status, items, actions }: CommandBarProps) {
  return (
    <header className="command-bar surface">
      <div className="command-bar__brand">
        <div className="command-mark" aria-hidden="true">
          {mark}
        </div>
        <div className="command-copy">
          <span className="section-tag">Console</span>
          <div className="command-title-row">
            <h1>{title}</h1>
            {status ? (
              <span className="signal" data-tone={status.tone ?? "neutral"}>
                {status.label}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="command-cluster" aria-label="Current status">
        {items.map((item) => (
          <div key={item.label} className="command-stat">
            <span>{item.label}</span>
            <strong data-tone={item.tone ?? "neutral"}>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="command-actions">{actions}</div>
    </header>
  );
}
