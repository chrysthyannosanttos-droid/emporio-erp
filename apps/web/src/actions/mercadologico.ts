"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

// Estrutura Padrão de Varejo / Supermercados
const DEFAULT_MERCADOLOGICO = [
  {
    name: "Mercearia",
    sections: [
      { name: "Mercearia Salgada", groups: ["Grãos & Cereais", "Massas & Molhos", "Óleos & Condimentos", "Enlatados & Conservas"] },
      { name: "Mercearia Doce", groups: ["Açúcar & Adoçantes", "Biscoitos & Chocolates", "Achocolatados & Matinais", "Sobremesas & Sobremesas"] }
    ]
  },
  {
    name: "Bebidas",
    sections: [
      { name: "Bebidas Não Alcoólicas", groups: ["Refrigerantes", "Sucos & Refrescos", "Águas Minerais", "Energéticos & Isotônicos"] },
      { name: "Bebidas Alcoólicas", groups: ["Cervejas", "Vinhos & Espumantes", "Destilados & Licores", "Cachaças & Drinks"] }
    ]
  },
  {
    name: "Frios & Laticínios",
    sections: [
      { name: "Laticínios", groups: ["Leites & Iogurtes", "Queijos", "Manteigas & Requeijão", "Sobremesas Lácteas"] },
      { name: "Embutidos & Frios", groups: ["Presuntaria & Fiambres", "Linguiças & Salsichas", "Salames & Defumados"] }
    ]
  },
  {
    name: "Padaria & Confeitaria",
    sections: [
      { name: "Pães", groups: ["Pães Artesanais & Fermentação Natural", "Pães Industriais", "Torradas & Croissants"] },
      { name: "Confeitaria", groups: ["Bolos & Tortas", "Doces & Salgados"] }
    ]
  },
  {
    name: "Hortifruti & Orgânicos",
    sections: [
      { name: "Frutas", groups: ["Frutas Nacionais", "Frutas Importadas"] },
      { name: "Legumes & Verduras", groups: ["Folhosos & Verduras", "Tubérculos & Raízes", "Temperos & Ervas"] }
    ]
  },
  {
    name: "Açougue & Peixaria",
    sections: [
      { name: "Carnes Bovinas & Suínas", groups: ["Cortes Bovinos Especiais", "Cortes Suínos", "Aves"] },
      { name: "Peixaria & Frutos do Mar", groups: ["Peixes Frescos", "Frutos do Mar"] }
    ]
  },
  {
    name: "Higiene & Perfumaria",
    sections: [
      { name: "Cuidado Pessoal", groups: ["Sabonetes & Banho", "Shampoos & Condicionadores", "Higiene Bucal", "Desodorantes"] }
    ]
  },
  {
    name: "Limpeza & Conservação",
    sections: [
      { name: "Cuidado com a Casa", groups: ["Detergentes & Sabões", "Desinfetantes & Limpadores", "Papéis & Toalhas"] }
    ]
  }
];

export async function getMercadologico() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado", categories: [] };
    }

    const categories = await prisma.category.findMany({
      where: { companyId: session.companyId },
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: "asc" }
    });

    return { categories };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar estrutura mercadológica", categories: [] };
  }
}

export async function createCategory(name: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida ou empresa não identificada." };
    }

    if (!name.trim()) return { error: "Nome do grupo/categoria é obrigatório." };

    const existing = await prisma.category.findFirst({
      where: { name: name.trim(), companyId: session.companyId }
    });

    if (existing) return { error: "Categoria/Grupo já cadastrado nesta empresa." };

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        companyId: session.companyId
      }
    });

    revalidatePath("/mercadologico");
    revalidatePath("/stock");
    return { success: true, category };
  } catch (err: any) {
    return { error: err.message || "Erro ao cadastrar categoria." };
  }
}

export async function deleteCategory(id: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }

    await prisma.category.deleteMany({
      where: { id, companyId: session.companyId }
    });

    revalidatePath("/mercadologico");
    revalidatePath("/stock");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao excluir categoria." };
  }
}

export async function seedDefaultMercadologico() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida ou empresa não identificada." };
    }

    const companyId = session.companyId;

    // Criar categorias representativas de varejo
    const created: string[] = [];
    for (const dept of DEFAULT_MERCADOLOGICO) {
      for (const sec of dept.sections) {
        for (const grp of sec.groups) {
          const categoryName = `${dept.name} > ${sec.name} > ${grp}`;
          const existing = await prisma.category.findFirst({
            where: { name: categoryName, companyId }
          });
          if (!existing) {
            await prisma.category.create({
              data: { name: categoryName, companyId }
            });
            created.push(categoryName);
          }
        }
      }
    }

    revalidatePath("/mercadologico");
    revalidatePath("/stock");
    return { success: true, count: created.length };
  } catch (err: any) {
    return { error: err.message || "Erro ao gerar mercadológico padrão." };
  }
}
