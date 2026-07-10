import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionRole = cookieStore.get("session_role")?.value;
  const sessionUser = cookieStore.get("session_user")?.value;

  // Apenas o super admin 'cristiano' pode acessar
  if (sessionRole !== "SUPER_ADMIN" || sessionUser?.toLowerCase() !== "cristiano") {
    redirect("/login");
  }

  return <>{children}</>;
}
