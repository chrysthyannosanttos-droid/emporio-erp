/**
 * Converte qualquer objeto retornado pelo Prisma (contendo Decimal, BigInt, Date)
 * em tipos primitivos planos (plain objects/numbers/strings) para que possam
 * atravessar a fronteira de Server Components / Server Actions para Client Components
 * no Next.js sem lançar o erro "Only plain objects can be passed to Client Components".
 */
export function toPlain<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(
    JSON.stringify(obj, (_key, val) => {
      if (val !== null && typeof val === "object" && typeof (val as any).toNumber === "function") {
        return (val as any).toNumber();
      }
      if (typeof val === "bigint") {
        return Number(val);
      }
      return val;
    })
  );
}

