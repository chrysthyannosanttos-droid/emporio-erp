"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { SYSTEM_MODULES_CATALOG } from "@/lib/modules-catalog";

export async function getCompanyModulesConfig() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return {
        error: "Não autorizado",
        companyName: "",
        operationTypes: ["RETAIL"],
        activeModules: [] as string[],
        hasHotelTabs: false,
        allModules: SYSTEM_MODULES_CATALOG,
      };
    }

    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: {
        id: true,
        name: true,
        operationTypes: true,
        activeModules: true,
        companyModules: true,
        hasHotelTabs: true,
      },
    });

    if (!company) {
      return {
        error: "Empresa não encontrada",
        companyName: "",
        operationTypes: ["RETAIL"],
        activeModules: [] as string[],
        hasHotelTabs: false,
        allModules: SYSTEM_MODULES_CATALOG,
      };
    }

    let operationTypes: string[] = ["RETAIL"];
    try {
      operationTypes = JSON.parse(company.operationTypes || "[\"RETAIL\"]");
      if (!Array.isArray(operationTypes) || operationTypes.length === 0) {
        operationTypes = ["RETAIL"];
      }
    } catch {
      operationTypes = ["RETAIL"];
    }

    // Garante isolamento estrito da feature flag HOTEL_TABS controlada pelo Master
    operationTypes = operationTypes.filter((op) => op !== "HOTEL_TABS");
    if (company.hasHotelTabs === true) {
      operationTypes.push("HOTEL_TABS");
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

    const result = {
      companyName: company.name,
      operationTypes,
      activeModules,
      hasHotelTabs: Boolean(company.hasHotelTabs),
      allModules: SYSTEM_MODULES_CATALOG,
    };
    return result;
  } catch (err: any) {
    return {
      error: err.message,
      companyName: "",
      operationTypes: ["RETAIL"],
      activeModules: [] as string[],
      hasHotelTabs: false,
      allModules: SYSTEM_MODULES_CATALOG,
    };
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

    const sanitizedOperationTypes = (data.operationTypes || []).filter((op) => op !== "HOTEL_TABS");
    const operationTypesJson = JSON.stringify(sanitizedOperationTypes);
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
