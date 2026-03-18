import Link from "next/link";

import type { Session } from "@data-hub/contracts";

import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { LiveStream } from "./live-stream";
import { StickyPlayer } from "./sticky-player";

const navItems = [
  { href: "/", label: "Inbox" },
  { href: "/newsroom", label: "Newsroom" },
  { href: "/channels", label: "Channels" },
  { href: "/podcasts", label: "Podcasts" },
  { href: "/saved", label: "Saved" },
  { href: "/settings", label: "Settings" },
  { href: "/admin", label: "Admin" },
];

export function AppShell({
  user,
  currentPath,
  eyebrow,
  title,
  description,
  children,
}: {
  user: Session["user"];
  currentPath: string;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <KeyboardShortcuts />
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark">DH</span>
          <div>
            <span className="eyebrow">Private social layer</span>
            <strong>Data Hub</strong>
          </div>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`nav__link ${currentPath === item.href ? "nav__link--active" : ""}`}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="profile-card">
          <span className="eyebrow">Signed in</span>
          <strong>{user.displayName}</strong>
          <span>
            {user.email} · {user.role}
          </span>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="topbar__actions">
            <form action="/search" className="search-form">
              <input id="global-search" name="q" placeholder="Search your hub…" />
            </form>
            <LiveStream />
          </div>
        </header>
        <div className="content-stack">{children}</div>
      </main>
      <StickyPlayer />
    </div>
  );
}
