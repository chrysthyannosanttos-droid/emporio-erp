import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import AuditClient from "./AuditClient";

export default async function AuditPage() {
  const session = await getSession();
  const isCristiano =
    Boolean(session?.isSuperAdmin) ||
    session?.name?.toLowerCase().includes("cristiano") ||
    Boolean(session?.email?.toLowerCase().includes("cristiano"));

  if (!isCristiano) {
    redirect("/");
  }

  return <AuditClient />;
}
