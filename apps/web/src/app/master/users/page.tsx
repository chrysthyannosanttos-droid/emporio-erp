import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { SupportUsersClient, type SystemSupportUserDTO } from "./SupportUsersClient";

export default async function MasterUsersPage() {
  const session = await getSession();
  if (!session?.isSuperAdmin && session?.role !== "ADMIN") redirect("/login");

  const systemUsers = await prisma.systemUser.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const serializedUsers: SystemSupportUserDTO[] = systemUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }));

  return (
    <SupportUsersClient
      initialUsers={serializedUsers}
      currentUserId={session.userId}
    />
  );
}
