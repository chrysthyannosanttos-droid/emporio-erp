import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export const ROLE_HIERARCHY: Record<string, { level: number; label: string; color: string }> = {
  ADMIN:      { level: 100, label: "Administrador da Empresa", color: "violet" },
  MANAGER:    { level: 80,  label: "Gerente Geral",            color: "indigo" },
  SUPERVISOR: { level: 60,  label: "Supervisor de Loja",       color: "amber" },
  OPERATOR:   { level: 40,  label: "Operador",                 color: "emerald" },
  VIEWER:     { level: 20,  label: "Usuário de Consulta",      color: "sky" },
};

/**
 * Retorna se o roleA possui nível hierárquico igual ou superior a roleB
 */
export function isRoleSufficient(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole]?.level || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole]?.level || 0;
  return userLevel >= requiredLevel;
}

/**
 * Obtém a lista completa de códigos de permissões efetivas do usuário,
 * combinando o perfil (Role) com permissões customizadas (UserPermission) por loja.
 */
export async function getUserEffectivePermissions(userId: string, storeId?: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roleRelation: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      },
      userPermissions: {
        include: { permission: true }
      }
    }
  });

  if (!user || !user.active) return [];

  // Se for ADMIN da empresa, tem todas as permissões
  if (user.role === "ADMIN") {
    const all = await prisma.permission.findMany({ select: { code: true } });
    return all.map(p => p.code);
  }

  const permissionsSet = new Set<string>();

  // 1. Permissões padrão da Role vinculada
  if (user.roleRelation) {
    for (const rp of user.roleRelation.permissions) {
      permissionsSet.add(rp.permission.code);
    }
  } else {
    // Fallback para Role pelo enum/string
    const defaultRole = await prisma.role.findFirst({
      where: { key: user.role, companyId: user.companyId },
      include: { permissions: { include: { permission: true } } }
    });
    if (defaultRole) {
      for (const rp of defaultRole.permissions) {
        permissionsSet.add(rp.permission.code);
      }
    }
  }

  // 2. Overrides específicos do usuário (UserPermission)
  for (const up of user.userPermissions) {
    // Aplicar se a permissão for global (storeId null) ou da loja atual
    if (!up.storeId || up.storeId === storeId) {
      if (up.granted) {
        permissionsSet.add(up.permission.code);
      } else {
        permissionsSet.delete(up.permission.code);
      }
    }
  }

  return Array.from(permissionsSet);
}

/**
 * Valida se um usuário possui permissão para executar determinada ação.
 */
export async function hasPermission(userId: string, permissionCode: string, storeId?: string): Promise<boolean> {
  const permissions = await getUserEffectivePermissions(userId, storeId);
  return permissions.includes(permissionCode);
}

/**
 * Avalia se uma operação específica com valor exige liberação de alçada superior.
 */
export async function checkOperationThreshold(
  companyId: string,
  operation: string,
  value: number = 0,
  userRole: string = "OPERATOR"
): Promise<{
  allowed: boolean;
  requiresApproval: boolean;
  requiredMinRole?: string;
  ruleName?: string;
}> {
  // Admin sempre tem liberação direta
  if (userRole === "ADMIN") {
    return { allowed: true, requiresApproval: false };
  }

  // Buscar regras de alçada ativas para a operação
  const rules = await prisma.approvalRule.findMany({
    where: { companyId, operation, active: true },
    orderBy: { minValue: "asc" },
  });

  if (rules.length === 0) {
    return { allowed: true, requiresApproval: false };
  }

  // Encontrar a regra que corresponde à faixa de valor
  const matchedRule = rules.find(r => {
    const min = Number(r.minValue);
    const max = r.maxValue ? Number(r.maxValue) : Infinity;
    return value >= min && value <= max;
  });

  if (!matchedRule) {
    return { allowed: true, requiresApproval: false };
  }

  const sufficient = isRoleSufficient(userRole, matchedRule.minRole);

  return {
    allowed: sufficient,
    requiresApproval: !sufficient,
    requiredMinRole: matchedRule.minRole,
    ruleName: matchedRule.name,
  };
}

/**
 * Valida as credenciais de um autorizador rápido (PIN ou Senha), garantindo:
 * 1. O autorizador existe e está ativo na mesma empresa
 * 2. O autorizador possui cargo suficiente (minRole)
 * 3. O autorizador NÃO é o próprio solicitante (Impede auto-aprovação!)
 */
export async function verifyQuickAuthorization({
  companyId,
  authorizerIdentifier,
  pinOrPassword,
  requiredMinRole = "SUPERVISOR",
  requesterId,
}: {
  companyId: string;
  authorizerIdentifier: string;
  pinOrPassword: string;
  requiredMinRole?: string;
  requesterId: string;
}): Promise<{
  success: boolean;
  error?: string;
  authorizer?: { id: string; name: string; email: string; role: string };
}> {
  if (!authorizerIdentifier || !pinOrPassword) {
    return { success: false, error: "Identificador (nome/e-mail) e PIN/Senha são obrigatórios." };
  }

  // Buscar autorizador na empresa
  const authorizer = await prisma.user.findFirst({
    where: {
      companyId,
      active: true,
      OR: [
        { email: authorizerIdentifier },
        { email: `${authorizerIdentifier}@emporio.com` },
        { name: { equals: authorizerIdentifier, mode: "insensitive" } },
      ],
    },
  });

  if (!authorizer) {
    return { success: false, error: "Autorizador não encontrado ou inativo." };
  }

  // REGRA DE SEGURANÇA 1: Proibido auto-aprovação
  if (authorizer.id === requesterId) {
    return { success: false, error: "Não é permitido autorizar a própria operação solicitada." };
  }

  // REGRA DE SEGURANÇA 2: Nível hierárquico mínimo
  if (!isRoleSufficient(authorizer.role, requiredMinRole)) {
    const minLabel = ROLE_HIERARCHY[requiredMinRole]?.label || requiredMinRole;
    return { success: false, error: `Esta operação exige liberação de um usuário com nível ${minLabel} ou superior.` };
  }

  // REGRA DE SEGURANÇA 3: Validação de PIN ou Senha (bcrypt com fallback para PIN puro)
  let isPinValid = false;
  if (authorizer.pin) {
    isPinValid = authorizer.pin === pinOrPassword || await bcrypt.compare(pinOrPassword, authorizer.pin).catch(() => false);
  }

  let isPasswordValid = false;
  if (!isPinValid) {
    isPasswordValid = authorizer.password === pinOrPassword || await bcrypt.compare(pinOrPassword, authorizer.password).catch(() => false);
  }

  if (!isPinValid && !isPasswordValid) {
    return { success: false, error: "PIN ou Senha de autorização incorretos." };
  }

  return {
    success: true,
    authorizer: {
      id: authorizer.id,
      name: authorizer.name,
      email: authorizer.email,
      role: authorizer.role,
    },
  };
}
