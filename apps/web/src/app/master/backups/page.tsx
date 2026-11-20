import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import BackupsClient from "./BackupsClient";

export default async function MasterBackupsPage() {
  const session = await getSession();
  const isCristiano =
    Boolean(session) &&
    ((session?.name || "").toLowerCase().includes("cristiano") ||
      (session?.email || "").toLowerCase().includes("cristiano") ||
      Boolean(session?.isSuperAdmin));

  if (!isCristiano) {
    redirect("/master");
  }

  return <BackupsClient />;
}
