"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

function toPlain<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, val) => {
      if (val !== null && typeof val === "object" && typeof (val as any).toNumber === "function") {
        return (val as any).toNumber();
      }
      if (typeof val === "bigint") return Number(val);
      return val;
    })
  );
}

export async function listPlans() {
  const session = await getSession();
  if (!session?.isSuperAdmin && session?.role !== "ADMIN") return { plans: [] };

  const plans = await prisma.plan.findMany({
    orderBy: { price: "asc" },
  });

  return { plans: toPlain(plans) };
}

export async function getPlan(id: string) {
  const session = await getSession();
  if (!session?.isSuperAdmin && session?.role !== "ADMIN") return { plan: null };
  if (!id) return { plan: null };

  const plan = await prisma.plan.findUnique({
    where: { id },
  });

  return { plan: plan ? toPlain(plan) : null };
}

export async function updatePlan(id: string, formData: FormData) {
  const session = await getSession();
  if (!session?.isSuperAdmin && session?.role !== "ADMIN") redirect("/login");

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const price = Number(formData.get("price"));
  const maxUsers = Number(formData.get("maxUsers") || 0);
  const maxProducts = Number(formData.get("maxProducts") || 0);
  const active = formData.get("active") === "true" || formData.get("active") === "on";

  if (!name || isNaN(price)) {
    return { error: "Nome e preço são obrigatórios." };
  }

  try {
    const plan = await prisma.plan.update({
      where: { id },
      data: {
        name,
        description,
        price,
        maxUsers,
        maxProducts,
        active,
      },
    });

    return { success: true, plan: JSON.parse(JSON.stringify(plan)) };
  } catch (err: any) {
    return { error: `Erro ao atualizar plano: ${err.message}` };
  }
}

export async function createPlan(formData: FormData) {
  const session = await getSession();
  if (!session?.isSuperAdmin && session?.role !== "ADMIN") redirect("/login");

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = Number(formData.get("price"));
  const maxUsers = Number(formData.get("maxUsers") || 0);
  const maxProducts = Number(formData.get("maxProducts") || 0);

  if (!name || isNaN(price)) {
    return { error: "Nome e preço são obrigatórios." };
  }

  const plan = await prisma.plan.create({
    data: {
      name,
      description,
      price,
      maxUsers,
      maxProducts,
      active: true,
    },
  });

  return { success: true, plan: JSON.parse(JSON.stringify(plan)) };
}
