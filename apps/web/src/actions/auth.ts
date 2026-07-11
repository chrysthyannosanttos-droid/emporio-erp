"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@emporio/database";

export async function login(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Preencha todos os campos." };
  }

  // ── Super Admin Cristiano ──────────────────────────────────────────────────
  if (username.toLowerCase() === "cristiano") {
    if (password !== "91126395") {
      return { error: "Senha incorreta." };
    }
    const cookieStore = await cookies();
    cookieStore.set("session_user", "cristiano", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    cookieStore.set("session_role", "SUPER_ADMIN", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return { success: true, redirectUrl: "/master/companies" };
  }

  // ── Usuário de empresa (busca no banco) ───────────────────────────────────
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          { name: { equals: username, mode: "insensitive" } },
        ],
        active: true,
      },
      include: { company: { select: { id: true, name: true } } },
    });

    if (!user) {
      return { error: "Usuário não encontrado." };
    }

    if (user.password !== password) {
      return { error: "Senha incorreta." };
    }

    const cookieStore = await cookies();
    cookieStore.set("session_user", user.name, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    cookieStore.set("session_role", user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    cookieStore.set("session_company", user.companyId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    cookieStore.set("session_company_name", user.company.name, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return { success: true, redirectUrl: "/" };
  } catch {
    return { error: "Erro ao autenticar. Tente novamente." };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session_user");
  cookieStore.delete("session_role");
  cookieStore.delete("session_company");
  cookieStore.delete("session_company_name");
  redirect("/login");
}
