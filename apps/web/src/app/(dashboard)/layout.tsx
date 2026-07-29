import { AiChatbot } from "@/components/AiChatbot";
import { getTenantTheme } from "@/actions/theme";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { DrawerLayout } from "./DrawerLayout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.isSuperAdmin) {
    redirect("/login");
  }

  const { theme } = await getTenantTheme();

  const userInitials = session.name.substring(0, 2).toUpperCase();
  const userName = session.name;
  const userRole = session.role;

  return (
    <DrawerLayout
      userName={userName}
      userRole={userRole}
      userInitials={userInitials}
      logoUrl={theme?.logoPrincipal ?? null}
    >
      {children}
      <AiChatbot />
    </DrawerLayout>
  );
}
