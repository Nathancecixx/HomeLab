import { AlertBoard } from "@/components/alert-board";
import { AppShell } from "@/components/app-shell";
import { getAlerts, requireSession } from "@/lib/server-api";

export default async function NewsroomPage() {
  const session = await requireSession();
  const alerts = await getAlerts();

  return (
    <AppShell
      user={session.user}
      currentPath="/newsroom"
      eyebrow="Situation Monitoring"
      title="Newsroom and active watchlists"
      description="Curated breaking sources, chronological incident clusters, and raw corroborating articles underneath."
    >
      {alerts.length ? <AlertBoard incidents={alerts} /> : <div className="empty-state">Create a watchlist from Settings to start monitoring breaking situations.</div>}
    </AppShell>
  );
}
