"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { SYSTEM_MODULES_CATALOG } from "@/lib/modules-catalog";

export async function getCompanyModulesConfig() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado", operationTypes: ["RETAIL"], activeModules: [] };
    }

    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: {
        id: true,
        name: true,
        operationTypes: true,
        activeModules: true,
        companyModules: true,
      },
    });

    if (!company) {
      return { error: "Empresa não encontrada", operationTypes: ["RETAIL"], activeModules: [] };
    }

    let operationTypes: string[] = ["RETAIL"];
    try {
      operationTypes = JSON.parse(company.operationTypes || "[\"RETAIL\"]");
    } catch {
      operationTypes = ["RETAIL"];
    }

    let activeModules: string[] = [];
    try {
      activeModules = JSON.parse(company.activeModules || "[]");
    } catch {
      activeModules = [];
    }

    // Se a lista de activeModules estiver vazia (novo tenant), calcular padrão baseado nos operationTypes
    if (activeModules.length === 0) {
      activeModules = SYSTEM_MODULES_CATALOG
        .filter(m => m.defaultActiveFor.some(op => operationTypes.includes(op)))
        .map(m => m.key);
    }

    return {
      companyName: company.name,
      operationTypes,
      activeModules,
      allModules: SYSTEM_MODULES_CATALOG,
    };
  } catch (err: any) {
    return { error: err.message, operationTypes: ["RETAIL"], activeModules: [] };
  }
}

export async function updateCompanyModules(data: {
  operationTypes: string[];
  activeModules: string[];
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão expirada ou não autorizada" };
    }

    const operationTypesJson = JSON.stringify(data.operationTypes);
    const activeModulesJson = JSON.stringify(data.activeModules);

    await prisma.company.update({
      where: { id: session.companyId },
      data: {
        operationTypes: operationTypesJson,
        activeModules: activeModulesJson,
      },
    });

    // Atualizar/Upsert na tabela company_modules
    for (const moduleKey of data.activeModules) {
      await prisma.companyModule.upsert({
        where: {
          companyId_moduleKey: {
            companyId: session.companyId,
            moduleKey,
          },
        },
        update: { active: true },
        create: {
          companyId: session.companyId,
          moduleKey,
          active: true,
        },
      });
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar módulos da empresa" };
  }
}
