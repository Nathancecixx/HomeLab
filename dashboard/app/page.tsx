import { DashboardView } from "@/components/dashboard-view";
import { getDashboardSnapshot } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();
  return <DashboardView initialSnapshot={snapshot} />;
}
