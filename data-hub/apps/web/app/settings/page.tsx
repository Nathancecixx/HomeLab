import { AppShell } from "@/components/app-shell";
import { SettingsConsole } from "@/components/settings-console";
import { getAgentTokens, getSummaries, getWatchlists, requireSession } from "@/lib/server-api";

export default async function SettingsPage() {
  const session = await requireSession();
  const [watchlists, tokens, summaries] = await Promise.all([
    getWatchlists(),
    getAgentTokens(),
    getSummaries(),
  ]);

  return (
    <AppShell
      user={session.user}
      currentPath="/settings"
      eyebrow="Personal Controls"
      title="Watchlists, tokens, and summaries"
      description="Build your own monitoring lenses, issue read/search tokens for local agents, and review generated summaries."
    >
      <SettingsConsole watchlists={watchlists} tokens={tokens} summaries={summaries} />
    </AppShell>
  );
}
