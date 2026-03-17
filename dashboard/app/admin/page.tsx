import { redirect } from "next/navigation";

import { AdminConsole } from "@/components/admin-console";
import { getSessionFromCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/admin/login");
  }

  return <AdminConsole />;
}
