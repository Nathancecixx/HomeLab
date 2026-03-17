import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import { getSessionFromCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getSessionFromCookies();
  if (session) {
    redirect("/admin");
  }

  return <AdminLoginForm />;
}
