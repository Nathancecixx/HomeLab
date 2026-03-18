import { redirect } from "next/navigation";

import { AdminConsole } from "@/components/admin-console";
import { AppShell } from "@/components/app-shell";
import { getEnabledModules, getSourceGroups, getSources, getSummaryProviders, requireSession } from "@/lib/server-api";

export default async function AdminPage() {
  const session = await requireSession();
  if (session.user.role !== "admin") {
    redirect("/");
  }

  const [groups, sources, providers, enabledModules] = await Promise.all([
    getSourceGroups(),
    getSources(),
    getSummaryProviders(),
    getEnabledModules(),
  ]);

  return (
    <AppShell
      user={session.user}
      currentPath="/admin"
      eyebrow="Admin"
      title="Shared catalog and system controls"
      description="Manage the household source library, module visibility, and AI provider setup without touching config files."
    >
      <AdminConsole groups={groups} sources={sources} providers={providers} enabledModules={enabledModules} />
    </AppShell>
  );
}
