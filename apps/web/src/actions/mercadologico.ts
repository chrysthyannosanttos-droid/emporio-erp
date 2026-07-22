"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

// Taxonomia Mercadológica Completa de Supermercados & Hipermercados
const DEFAULT_MERCADOLOGICO = [
  {
    name: "01 - Mercearia Salgada",
    sections: [
      { name: "Grãos & Cereais", groups: ["Arroz Branco & Integral", "Feijões & Lentilhas", "Milho, Milharina & Pipoca", "Farinha de Trigo & Mandioca"] },
      { name: "Massas & Molhos", groups: ["Macarrão Grano Duro & Ovos", "Massas Instantâneas", "Molhos & Extratos de Tomate", "Massas Frescas"] },
      { name: "Óleos & Condimentos", groups: ["Óleos de Soja, Girassol & Canola", "Azeites de Oliva", "Vinagres & Aceto", "Maionese, Ketchup & Mostarda"] },
      { name: "Enlatados & Conservas", groups: ["Milho & Ervilha em Lata", "Atum & Sardinha", "Azeitonas & Cogumelos", "Palmitos & Conservas"] },
      { name: "Caldos & Temperos", groups: ["Caldos Prontos", "Temperos em Pó & Pasta", "Especiarias & Pimentas", "Farofas Prontas"] }
    ]
  },
  {
    name: "02 - Mercearia Doce & Matinais",
    sections: [
      { name: "Achocolatados & Cafés", groups: ["Café Torrado & Moído", "Café Solúvel & Cápsulas", "Achocolatados em Pó", "Chás & Infusões"] },
      { name: "Biscoitos & Snacks", groups: ["Biscoitos Salgados & Crackers", "Biscoitos Doces & Recheados", "Wafers & Cookies", "Salgadinhos & Snacks"] },
      { name: "Chocolates & Doces", groups: ["Barras de Chocolate", "Bombons & Caixas", "Guloseimas & Balas", "Sobremesas & Gelatinas"] },
      { name: "Cereais & Matinais", groups: ["Cereais Matinais & Corn Flakes", "Granolas & Aveia", "Açúcares & Adoçantes", "Mel & Geleias"] },
      { name: "Leites & Doces em Calda", groups: ["Leite Condensado & Creme de Leite", "Misturas para Bolo", "Doces de Leite & Compotas"] }
    ]
  },
  {
    name: "03 - Bebidas",
    sections: [
      { name: "Bebidas Não Alcoólicas", groups: ["Refrigerantes Lata & Pet", "Refrigerantes Zero & Diet", "Sucos Prontos & Polpas", "Refrescos em Pó"] },
      { name: "Águas & Funcionais", groups: ["Águas Minerais Sem Gás", "Águas Minerais Com Gás", "Energéticos & Isotônicos", "Chás Gelados"] },
      { name: "Cervejas", groups: ["Cervejas Pilsen & Lager", "Cervejas Puro Malte", "Cervejas Especiais & IPA", "Cervejas Sem Álcool"] },
      { name: "Vinhos & Espumantes", groups: ["Vinhos Nacionais", "Vinhos Importados", "Espumantes & Frisantes", "Vinhos Suaves"] },
      { name: "Destilados & Licores", groups: ["Whiskies & Bourbons", "Vodkas & Gins", "Cachaças & Destilados", "Licores & Aperitivos"] }
    ]
  },
  {
    name: "04 - Frios & Laticínios",
    sections: [
      { name: "Laticínios", groups: ["Leites UHT (Integral, Desnatado, Sem Lactose)", "Iogurtes & Leites Fermentados", "Requeijão & Cream Cheese", "Manteigas & Margarinas"] },
      { name: "Queijos", groups: ["Mussarela & Prato", "Parmesão & Queijos Ralados", "Queijos Minas & Frescais", "Queijos Especiais & Gorgonzola"] },
      { name: "Embutidos & Frios", groups: ["Presuntaria & Apresuntados", "Peito de Peru & Chester", "Mortadela & Salames", "Bacon & Defumados"] },
      { name: "Linguiças & Salsichas", groups: ["Linguiça Calabresa & Paio", "Linguiças Frescais para Churrasco", "Salsichas Hot Dog"] }
    ]
  },
  {
    name: "05 - Congelados",
    sections: [
      { name: "Pratos Prontos", groups: ["Pizzas Congeladas", "Lasanhas & Pratos Prontos", "Hambúrgueres & Empanados", "Batatas Congeladas"] },
      { name: "Sobremesas & Sorvetes", groups: ["Sorvetes Pote & Massa", "Picolés & Paletas", "Açaí & Polpas Congeladas", "Tortas Congeladas"] },
      { name: "Massas & Salgados", groups: ["Pães de Queijo Congelados", "Salgados & Folhados", "Vegetais & Ervilhas Congeladas"] }
    ]
  },
  {
    name: "06 - Açougue & Aves",
    sections: [
      { name: "Carnes Bovinas", groups: ["Cortes Bovinos Nobres (Picanha, Filet, Alcatra)", "Cortes Bovinos de Primeira (Coxão Mole, Patinho)", "Cortes Bovinos para Cozimento (Acém, Músculo)"] },
      { name: "Carnes Suínas", groups: ["Lombo & Costela Suína", "Bisteca & Pernil", "Cortes Suínos Temperados"] },
      { name: "Aves", groups: ["Frango Inteiro", "Peito & Filé de Frango", "Coxa, Sobrecoxa & Tulipa", "Aves Especiais & Perus"] }
    ]
  },
  {
    name: "07 - Peixaria & Frutos do Mar",
    sections: [
      { name: "Peixes Frescos & Congelados", groups: ["Filé de Salmão", "Filé de Tilápia & Peixes Brancos", "Bacalhau & Peixes Salgados"] },
      { name: "Frutos do Mar", groups: ["Camarões Limpos & Inteiros", "Lulas, Polvos & Mariscos", "Empanados & Bolinhos de Peixe"] }
    ]
  },
  {
    name: "08 - Hortifruti (FLV)",
    sections: [
      { name: "Frutas", groups: ["Frutas Nacionais (Banana, Maçã, Laranja)", "Frutas Importadas (Uva, Pêra, Kiwi)", "Citros & Melões"] },
      { name: "Legumes & Tubérculos", groups: ["Batata, Cebola & Alho", "Tomates & Pimentões", "Cenoura, Chuchu & Abóbora"] },
      { name: "Verduras & Ervas", groups: ["Folhosos & Alfaces", "Temperos Verdes & Ervas Frescas", "Ovos Brancos, Vermelhos & Caipira"] }
    ]
  },
  {
    name: "09 - Padaria & Confeitaria",
    sections: [
      { name: "Pães", groups: ["Pão Francês & Pão de Queijo", "Pães de Forma & Bisnaguita", "Pães Especiais & Fermentação Natural"] },
      { name: "Confeitaria & Salgados", groups: ["Bolos Simples & Confeitados", "Tortas & Doces Finos", "Salgados Assados & Fritos"] }
    ]
  },
  {
    name: "10 - Higiene & Perfumaria",
    sections: [
      { name: "Banho & Cuidado Pessoal", groups: ["Sabonetes em Barra & Líquidos", "Shampoos & Condicionadores", "Tratamento Capilar & Cremes"] },
      { name: "Higiene Bucal", groups: ["Cremes Dentais", "Escovas & Fio Dental", "Enxaguantes Bucais"] },
      { name: "Desodorantes & Barbear", groups: ["Desodorantes Aerosol & Roll-on", "Lâminas & Aparelhos de Barbear", "Cremes de Barbear & Pós-Barba"] },
      { name: "Higiene Infantil & Intima", groups: ["Fraldas Infantis & Toalhas Umidecidas", "Absorventes & Higiene Íntima", "Fraldas Geriátricas"] }
    ]
  },
  {
    name: "11 - Limpeza & Conservação",
    sections: [
      { name: "Lavanderia", groups: ["Detergentes em Pó & Líquidos", "Amaciantes de Roupas", "Tira-Manchas & Alvejantes"] },
      { name: "Limpeza Geral", groups: ["Detergentes para Louça", "Desinfetantes & Limpadores de Piso", "Multiusos & Limpa-Vidros", "Saponáceos & Cloro"] },
      { name: "Papéis & Descartáveis", groups: ["Papel Higiênico", "Papel Toalha & Guardanapos", "Sacos de Lixo"] },
      { name: "Utensílios de Limpeza", groups: ["Esponjas & Palhas de Aço", "Panos Multiuso & Flanalas", "Vassouras, Rodos & Baldes"] }
    ]
  },
  {
    name: "12 - Bazar, Utilidades & Pet Shop",
    sections: [
      { name: "Pet Shop", groups: ["Rações para Cães", "Rações para Gatos", "Petiscos & Sachês", "Higiene & Areias Pet"] },
      { name: "Churrasco & Utilidades", groups: ["Carvão & Acendedores", "Grelhas & Espetos", "Descartáveis & Potes Plásticos", "Lâmpadas & Pilhas"] }
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
