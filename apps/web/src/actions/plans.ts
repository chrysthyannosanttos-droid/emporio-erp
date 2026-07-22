"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function listPlans() {
  const session = await getSession();
  if (!session?.isSuperAdmin) return { plans: [] };

  const plans = await prisma.plan.findMany({
    orderBy: { price: "asc" },
  });

  return { plans };
}

export async function createPlan(formData: FormData) {
  const session = await getSession();
  if (!session?.isSuperAdmin) redirect("/login");

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

  return { success: true, plan };
}
