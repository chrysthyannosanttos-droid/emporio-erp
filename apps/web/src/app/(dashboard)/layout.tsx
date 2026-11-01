import { getTenantTheme } from "@/actions/theme";
import { getCompanyModulesConfig } from "@/actions/modules";
import { getSession } from "@/lib/session";
import { validateActiveSession } from "@/actions/auth";
import { getUserEffectivePermissions } from "@/lib/permissions";
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

  // Validação de acesso simultâneo: se o usuário conectou em outro dispositivo, encerra esta sessão
  const sessionStatus = await validateActiveSession();
  if (!sessionStatus.valid) {
    if (sessionStatus.reason === "CONCURRENT_LOGIN") {
      redirect("/login?reason=concurrent_session");
    }
    redirect("/login");
  }

  // ADMIN tem acesso total; os demais dependem das permissões do perfil.
  // A consulta roda em paralelo com as demais, sem aumentar o tempo de espera.
  const mobilePdvPromise: Promise<boolean> =
    session.role === "ADMIN"
      ? Promise.resolve(true)
      : getUserEffectivePermissions(session.userId)
          .then((perms) => perms.includes("pdv.mobile") && perms.includes("pdv.sale"))
          .catch(() => false);

  const [{ theme }, { activeModules, operationTypes }, canMobilePdv] = await Promise.all([
    getTenantTheme(),
    getCompanyModulesConfig(),
    mobilePdvPromise,
  ]);

  const userInitials = session.name.substring(0, 2).toUpperCase();
  const userName = session.name;
  const userRole = session.role;

  return (
    <DrawerLayout
      userName={userName}
      userRole={userRole}
      userInitials={userInitials}
      logoUrl={theme?.logoPrincipal ?? null}
      activeModules={activeModules}
      operationTypes={operationTypes}
      canMobilePdv={canMobilePdv}
    >
      {children}
    </DrawerLayout>
  );
}
