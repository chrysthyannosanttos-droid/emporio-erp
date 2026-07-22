import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.isSuperAdmin) {
    redirect("/login");
  }

  return <>{children}</>;
}
