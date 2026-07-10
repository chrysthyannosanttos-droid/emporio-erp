"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Preencha todos os campos." };
  }

  // Lógica mock de autenticação para o usuário "cristiano" (super admin)
  if (username.toLowerCase() === "cristiano") {
    if (password !== "91126395") {
      return { error: "Senha incorreta." };
    }

    const cookieStore = await cookies();
    cookieStore.set("session_user", "cristiano", { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7 // 1 semana
    });
    cookieStore.set("session_role", "SUPER_ADMIN", { path: "/" });
    
    return { success: true, redirectUrl: "/master/theme" };
  }

  if (password === "123") {
    const cookieStore = await cookies();
    cookieStore.set("session_user", username, { path: "/" });
    cookieStore.set("session_role", "OPERATOR", { path: "/" });
    return { success: true, redirectUrl: "/" };
  }

  return { error: "Credenciais inválidas." };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session_user");
  cookieStore.delete("session_role");
  redirect("/login");
}
