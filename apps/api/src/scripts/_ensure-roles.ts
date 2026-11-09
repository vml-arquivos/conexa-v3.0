import { PrismaClient, RoleType, RoleLevel } from '@prisma/client';

/**
 * Mapeamento de RoleType para RoleLevel
 */
const ROLE_TYPE_TO_LEVEL: Record<RoleType, RoleLevel> = {
  DEVELOPER: 'DEVELOPER',
  MANTENEDORA_ADMIN: 'MANTENEDORA',
  MANTENEDORA_FINANCEIRO: 'MANTENEDORA',
  STAFF_CENTRAL_PEDAGOGICO: 'STAFF_CENTRAL',
  STAFF_CENTRAL_PSICOLOGIA: 'STAFF_CENTRAL',
  UNIDADE_DIRETOR: 'UNIDADE',
  UNIDADE_COORDENADOR_PEDAGOGICO: 'UNIDADE',
  UNIDADE_ADMINISTRATIVO: 'UNIDADE',
  UNIDADE_NUTRICIONISTA: 'UNIDADE',
  PROFESSOR: 'PROFESSOR',
  PROFESSOR_AUXILIAR: 'PROFESSOR',
  MANUTENCAO_EXECUTOR: 'MANUTENCAO',
};

/**
 * Nomes amigáveis para cada RoleType
 */
const ROLE_TYPE_NAMES: Record<RoleType, string> = {
  DEVELOPER: 'Desenvolvedor',
  MANTENEDORA_ADMIN: 'Administrador da Mantenedora',
  MANTENEDORA_FINANCEIRO: 'Financeiro da Mantenedora',
  STAFF_CENTRAL_PEDAGOGICO: 'Coordenação Pedagógica Central',
  STAFF_CENTRAL_PSICOLOGIA: 'Psicologia Central',
  UNIDADE_DIRETOR: 'Diretor de Unidade',
  UNIDADE_COORDENADOR_PEDAGOGICO: 'Coordenador Pedagógico de Unidade',
  UNIDADE_ADMINISTRATIVO: 'Administrativo de Unidade',
  UNIDADE_NUTRICIONISTA: 'Nutricionista de Unidade',
  PROFESSOR: 'Professor',
  PROFESSOR_AUXILIAR: 'Professor Auxiliar',
  MANUTENCAO_EXECUTOR: 'Manutenção',
};

/**
 * Garante que todos os Roles existem para a mantenedora
 * Idempotente: pode rodar múltiplas vezes sem duplicar
 * 
 * @param prisma - Cliente Prisma
 * @param mantenedoraId - ID da mantenedora
 * @returns Map de RoleType para Role.id
 */
export async function ensureRoles(
  prisma: PrismaClient,
  mantenedoraId: string,
): Promise<Map<RoleType, string>> {
  console.log(`🔧 Garantindo roles para mantenedora ${mantenedoraId}...`);

  const roleMap = new Map<RoleType, string>();
  let created = 0;
  let existing = 0;

  // Iterar sobre todos os RoleTypes
  for (const type of Object.values(RoleType)) {
    const level = ROLE_TYPE_TO_LEVEL[type];
    const name = ROLE_TYPE_NAMES[type];

    // Upsert role (cria se não existir, atualiza se existir)
    const role = await prisma.role.upsert({
      where: {
        mantenedoraId_type: {
          mantenedoraId,
          type,
        },
      },
      create: {
        mantenedoraId,
        type,
        level,
        name,
        description: `Role padrão: ${name}`,
        isActive: true,
        isCustom: false,
      },
      update: {
        // Atualizar campos caso o role já exista (garantir consistência)
        level,
        name,
        isActive: true,
      },
    });

    roleMap.set(type, role.id);

    if (role.createdAt.getTime() === role.updatedAt.getTime()) {
      created++;
      console.log(`  ✅ Criado: ${type} (${role.id})`);
    } else {
      existing++;
      console.log(`  🔄 Já existe: ${type} (${role.id})`);
    }
  }

  console.log(`\n📊 Roles garantidos:`);
  console.log(`   - Criados: ${created}`);
  console.log(`   - Já existentes: ${existing}`);
  console.log(`   - Total: ${roleMap.size}\n`);

  return roleMap;
}
