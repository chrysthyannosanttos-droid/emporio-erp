export interface ScaleSectorConfig {
  id: string;
  name: string;
  prefix: number; // 5 para Carnes, 6 para Horti, etc.
  deptCode: number; // Departamento MGV6 (01, 02...)
  defaultDays: number;
  keywords: string[];
}

export const DEFAULT_SCALE_SECTORS: ScaleSectorConfig[] = [
  {
    id: "carnes",
    name: "Carnes / Açougue",
    prefix: 5,
    deptCode: 1,
    defaultDays: 3,
    keywords: ["carne", "acougue", "açougue", "bovino", "suino", "suíno", "frango", "ave", "alcatra", "picanha", "patinho", "costela", "maminha", "cupim", "bife"]
  },
  {
    id: "horti",
    name: "Hortifrúti / FLV",
    prefix: 6,
    deptCode: 2,
    defaultDays: 5,
    keywords: ["horti", "flv", "fruta", "legume", "verdura", "tomate", "banana", "maca", "maçã", "laranja", "batata", "cebola", "alface", "cenoura", "mamao", "mamão", "melancia"]
  },
  {
    id: "padaria",
    name: "Padaria / Confeitaria",
    prefix: 7,
    deptCode: 3,
    defaultDays: 2,
    keywords: ["padaria", "confeitaria", "pao", "pão", "bolo", "rosca", "broa", "salgado", "baguete", "croissant", "torta", "sonho"]
  },
  {
    id: "frios",
    name: "Frios / Laticínios",
    prefix: 4,
    deptCode: 4,
    defaultDays: 10,
    keywords: ["frio", "laticinio", "laticínio", "queijo", "presunto", "mussarela", "mortadela", "salame", "embutido", "peito de peru", "bacon"]
  },
  {
    id: "peixaria",
    name: "Peixaria / Frutos do Mar",
    prefix: 3,
    deptCode: 5,
    defaultDays: 2,
    keywords: ["peixe", "peixaria", "frutos do mar", "salmao", "salmão", "tilapia", "tilápia", "camarao", "camarão", "bacalhau", "pescada", "sardinha"]
  },
  {
    id: "rotisseria",
    name: "Rotisseria / Prontos",
    prefix: 2,
    deptCode: 6,
    defaultDays: 1,
    keywords: ["rotisseria", "pronto", "refeicao", "refeição", "marmita", "assado", "frango assado", "lasanha pronta", "maionese"]
  },
  {
    id: "geral",
    name: "Outros / Geral",
    prefix: 1,
    deptCode: 7,
    defaultDays: 0,
    keywords: ["geral", "outros", "mercearia", "pesavel", "granel"]
  }
];

/**
 * Identifica o setor provável pelo nome do produto ou categoria
 */
export function detectScaleSector(name: string = "", categoryName: string = ""): ScaleSectorConfig {
  const text = `${name} ${categoryName}`.toLowerCase();
  for (const sector of DEFAULT_SCALE_SECTORS) {
    if (sector.keywords.some(k => text.includes(k))) {
      return sector;
    }
  }
  return DEFAULT_SCALE_SECTORS[0]; // fallback Carnes ou Geral
}

