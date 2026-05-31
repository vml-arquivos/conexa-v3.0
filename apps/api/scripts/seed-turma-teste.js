/**
 * seed-turma-teste.js — Versão JavaScript pura para execução no container
 *
 * Uso no container do backend:
 *   node /app/scripts/seed-turma-teste.js
 *
 * Idempotente: pode rodar múltiplas vezes sem duplicar dados.
 * Funciona em testepiloto, planopiloto e produção.
 */
'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// ── Constantes ────────────────────────────────────────────────────────────────
const UNIT_ID_TESTE  = 'unit-cepi-piloto-teste';
const MANTENEDORA_ID = 'mant-cocris-001';
const CLASSROOM_CODE = 'MATERNAL-II-PILOTO';

// ── Mapeamento de RoleType → RoleLevel ───────────────────────────────────────
const ROLE_TYPE_TO_LEVEL = {
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
};

const ROLE_TYPE_NAMES = {
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
};

// ── Usuários de teste ─────────────────────────────────────────────────────────
const USUARIOS_TESTE_DEF = [
  { email: 'professor@testepiloto.com.br',     firstName: 'PROFESSORA',    lastName: 'PILOTO', roleType: 'PROFESSOR' },
  { email: 'coordenador@testepiloto.com.br',   firstName: 'COORDENADORA',  lastName: 'PILOTO', roleType: 'UNIDADE_COORDENADOR_PEDAGOGICO' },
  { email: 'diretor@testepiloto.com.br',       firstName: 'DIRETORA',      lastName: 'PILOTO', roleType: 'UNIDADE_DIRETOR' },
  { email: 'nutricionista@testepiloto.com.br', firstName: 'NUTRICIONISTA', lastName: 'PILOTO', roleType: 'UNIDADE_NUTRICIONISTA' },
  { email: 'secretaria@testepiloto.com.br',    firstName: 'SECRETÁRIA',    lastName: 'PILOTO', roleType: 'UNIDADE_ADMINISTRATIVO' },
  { email: 'coordgeral@testepiloto.com.br',    firstName: 'COORD. GERAL',  lastName: 'PILOTO', roleType: 'STAFF_CENTRAL_PEDAGOGICO' },
];

// ── ensureRoles (inline) ──────────────────────────────────────────────────────
async function ensureRoles(mantenedoraId) {
  console.log(`🔧 Garantindo roles para mantenedora ${mantenedoraId}...`);
  const roleMap = new Map();
  let created = 0;
  let existing = 0;

  for (const type of Object.keys(ROLE_TYPE_TO_LEVEL)) {
    const level = ROLE_TYPE_TO_LEVEL[type];
    const name  = ROLE_TYPE_NAMES[type];

    const role = await prisma.role.upsert({
      where: { mantenedoraId_type: { mantenedoraId, type } },
      create: { mantenedoraId, type, level, name, description: `Role padrão: ${name}`, isActive: true, isCustom: false },
      update: { level, name, isActive: true },
    });

    roleMap.set(type, role.id);
    const isNew = role.createdAt.getTime() === role.updatedAt.getTime();
    if (isNew) { created++; console.log(`  ✅ Criado: ${type} (${role.id})`); }
    else        { existing++; console.log(`  🔄 Já existe: ${type} (${role.id})`); }
  }

  console.log(`\n📊 Roles garantidos: ${created} criados, ${existing} existentes, ${roleMap.size} total\n`);
  return roleMap;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🧪 SEED — Turma de Teste Piloto\n');

  const senhaHash = await bcrypt.hash('Teste@123', 10);

  // 1. Garantir roles
  const roleMap = await ensureRoles(MANTENEDORA_ID);

  // 2. Resolver usuários com roleId dinâmico
  const usuariosResolvidos = USUARIOS_TESTE_DEF.map((u) => ({
    ...u,
    roleId: roleMap.get(u.roleType),
    level:  ROLE_TYPE_TO_LEVEL[u.roleType],
  }));

  // 3. Garantir unidade de teste
  await prisma.unit.upsert({
    where: { id: UNIT_ID_TESTE },
    update: {},
    create: {
      id: UNIT_ID_TESTE,
      mantenedoraId: MANTENEDORA_ID,
      name: 'CEPI Piloto — Turma de Teste',
      code: 'CEPI-PILOTO-TESTE',
      address: 'Brasília, DF',
      city: 'Brasília',
      state: 'DF',
      email: 'piloto@testepiloto.com.br',
      phone: '(61) 3000-0000',
      capacity: 30,
      ageGroupsServed: '2-5',
    },
  });

  // 4. Criar/atualizar usuários de teste
  console.log('\n── Usuários de teste ──');
  let profTeste = null;
  for (const u of usuariosResolvidos) {
    if (!u.roleId) {
      console.log(`  ⚠️  Role não encontrado para ${u.email} (${u.roleType}) — pulando`);
      continue;
    }
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { roleId: u.roleId },
      create: {
        email: u.email,
        password: senhaHash,
        firstName: u.firstName,
        lastName: u.lastName,
        roleId: u.roleId,
        mantenedoraId: MANTENEDORA_ID,
        isActive: true,
      },
    });
    // Garantir unitScope
    await prisma.userUnitScope.upsert({
      where: { userId_unitId: { userId: user.id, unitId: UNIT_ID_TESTE } },
      update: {},
      create: { userId: user.id, unitId: UNIT_ID_TESTE },
    });
    if (u.roleType === 'PROFESSOR') profTeste = user;
    console.log(`  ✅ ${u.email.padEnd(42)} → ${u.roleType}`);
  }

  if (!profTeste) {
    console.log('  ⚠️  Usuário professor não encontrado — buscando...');
    profTeste = await prisma.user.findUnique({ where: { email: 'professor@testepiloto.com.br' } });
  }

  if (!profTeste) {
    console.log('❌ Professor de teste não encontrado. Abortando criação de turma/alunos.');
    return;
  }

  // 5. Garantir turma
  const classroom = await prisma.classroom.upsert({
    where: { unitId_code: { unitId: UNIT_ID_TESTE, code: CLASSROOM_CODE } },
    update: {},
    create: {
      unitId: UNIT_ID_TESTE,
      name: 'Maternal II — PILOTO (Turma de Teste)',
      code: CLASSROOM_CODE,
      ageGroupMin: 24,
      ageGroupMax: 48,
      capacity: 15,
    },
  });
  console.log(`\n  ✅ Turma: ${classroom.name}`);

  // 6. Vincular professor à turma
  await prisma.classroomTeacher.upsert({
    where: { classroomId_teacherId: { classroomId: classroom.id, teacherId: profTeste.id } },
    update: {},
    create: { classroomId: classroom.id, teacherId: profTeste.id, isActive: true },
  });

  console.log('\n🎉 Seed de usuários de teste concluído com sucesso!');
  console.log('\n📋 RESUMO — Logins de teste (senha: Teste@123):');
  console.log('  professor@testepiloto.com.br      → PROFESSOR         → /app/teacher-dashboard');
  console.log('  coordenador@testepiloto.com.br    → COORDENADOR       → /app/dashboard');
  console.log('  diretor@testepiloto.com.br        → DIRETOR           → /app/diretor');
  console.log('  nutricionista@testepiloto.com.br  → NUTRICIONISTA     → /app/nutricionista');
  console.log('  secretaria@testepiloto.com.br     → SECRETÁRIA        → /app/secretaria  ← corrigido');
  console.log('  coordgeral@testepiloto.com.br     → COORD. CENTRAL    → /app/central');
}

main().catch(console.error).finally(() => prisma.$disconnect());
