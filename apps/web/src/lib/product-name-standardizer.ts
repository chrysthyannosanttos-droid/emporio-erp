/**
 * Padroniza descrições de produtos seguindo o dicionário oficial de abreviações
 * para caber com clareza em cupom NFC-e 80mm, etiqueta, balança e listagem de estoque.
 */
export function standardizeProductName(rawName: string): string {
  if (!rawName) return "";

  let s = rawName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

  // Remove códigos numéricos colados no início (ex: "120623MEL DE ABELHA..." -> "MEL DE ABELHA...")
  s = s.replace(/^\d{4,}(?=[A-Z])/, "");

  // Normaliza multiplicadores e unidades (ex: "1X1LT" -> "1L", "260 ml" -> "260ML", "500 gr" -> "500G")
  s = s.replace(/\b1\s*[X*]\s*(\d+(?:[.,]\d+)?)\s*(ML|L|LT|G|GR|KG)\b/g, "$1$2");
  s = s.replace(/\b(\d+(?:[.,]\d+)?)\s*(ML|LT|L|GR|G|KG)\b/g, (_, num, unit) => {
    const cleanUnit = unit === "LT" ? "L" : unit === "GR" ? "G" : unit;
    return `${num}${cleanUnit}`;
  });

  // Frases compostas primeiro
  const phraseReplacements: [RegExp, string][] = [
    [/\bBEBIDA LACTEA\b/g, "BEB LAC"],
    [/\bAGUA MINERAL\b/g, "AGUA MIN"],
    [/\bCOM GAS\b/g, "C/GAS"],
    [/\bSEM GAS\b/g, "S/GAS"],
    [/\bCARNE DE SOL\b/g, "C/SOL"],
    [/\bLEITE CONDENSADO\b/g, "LEITE COND"],
    [/\bCREME DE LEITE\b/g, "CR LEITE"],
    [/\bPAPEL HIGIENICO\b/g, "PAPEL HIG"],
    [/\bDETERGENTE LIQUIDO\b/g, "DET LIQ"],
    [/\bMEL DE ABELHA\b/g, "MEL ABELHA"],
  ];
  for (const [rx, rep] of phraseReplacements) {
    s = s.replace(rx, rep);
  }

  // Palavras individuais
  const wordReplacements: [RegExp, string][] = [
    [/\bCHOCOLATE\b/g, "CHOC"],
    [/\bTRADICIONAL\b/g, "TRAD"],
    [/\bINTEGRAL\b/g, "INT"],
    [/\bDESNATADO\b/g, "DESN"],
    [/\bDESNATADA\b/g, "DESN"],
    [/\bCONDENSADO\b/g, "COND"],
    [/\bMANTEIGA\b/g, "MANT"],
    [/\bQUEIJO\b/g, "QJ"],
    [/\bREFRIGERANTE\b/g, "REFRIG"],
    [/\bAGUARDENTE\b/g, "AGUARD"],
    [/\bCERVEJA\b/g, "CERV"],
    [/\bBISCOITO\b/g, "BISC"],
    [/\bACHOCOLATADO\b/g, "ACHOC"],
    [/\bTEMPERO\b/g, "TEMP"],
    [/\bFRASCO\b/g, "FR"],
    [/\bGARRAFA\b/g, "GF"],
    [/\bPACOTE\b/g, "PCT"],
    [/\bCAIXA\b/g, "CX"],
    [/\bUNIDADE\b/g, "UN"],
    [/\bORIGINAL\b/g, "ORIG"],
    [/\bREFINADO\b/g, "REF"],
    [/\bUHT\b/g, ""],
  ];
  for (const [rx, rep] of wordReplacements) {
    s = s.replace(rx, rep);
  }

  // Limpa espaços múltiplos
  s = s.replace(/\s+/g, " ").trim();

  // Remove repetições de marca/peso (ex: "3 CORACOES ... 3 CORACOES ... 260ML 260ML")
  const tokens = s.split(" ").filter(Boolean);
  const deduped: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    // Evita repetir volume/peso já presente
    if (/^\d+(?:[.,]\d+)?(ML|L|G|KG)$/.test(tok) && deduped.includes(tok)) {
      continue;
    }
    // Evita repetir token imediatamente igual
    if (deduped[deduped.length - 1] === tok) {
      continue;
    }
    // Evita repetir par de palavras já visto (ex: "3 CORACOES" duas vezes)
    if (i + 1 < tokens.length) {
      const pair = `${tok} ${tokens[i + 1]}`;
      const joined = deduped.join(" ");
      if (pair.length >= 5 && joined.includes(pair)) {
        i += 1;
        continue;
      }
    }
    deduped.push(tok);
  }

  // Move volume/embalagem CX/X para ficar organizado se terminar limpo
  let result = deduped.join(" ").replace(/\s+/g, " ").trim();

  // Remove conectivos soltos se ainda passar de 45 chars
  if (result.length > 45) {
    result = result
      .replace(/\b(DE|DA|DO|DAS|DOS)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return result;
}
