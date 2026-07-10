"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";

export async function getCampaigns() {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        product: true,
      },
      orderBy: { createdAt: "desc" }
    });
    return { campaigns };
  } catch (err: any) {
    return { error: err.message || "Erro ao obter campanhas", campaigns: [] };
  }
}

export async function createCampaign(data: {
  name: string;
  type: string;
  description?: string;
  startDate: string;
  endDate?: string;
  active: boolean;
  rules?: any;
  productId?: string;
}) {
  try {
    const company = await prisma.company.findFirst();
    const companyId = company?.id;
    if (!companyId) return { error: "Empresa não cadastrada." };

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        active: data.active,
        rules: data.rules ? JSON.stringify(data.rules) : null,
        productId: data.productId || null,
        companyId
      }
    });

    revalidatePath("/crm");
    return { success: true, campaign };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar campanha" };
  }
}

export async function toggleCampaignStatus(id: string, active: boolean) {
  try {
    await prisma.campaign.update({
      where: { id },
      data: { active }
    });
    revalidatePath("/crm");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar status da campanha" };
  }
}
