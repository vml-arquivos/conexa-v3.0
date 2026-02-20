const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed Completo - Criando estrutura e 13 usuários\n');

  // 1. Criar Mantenedora
  const mantenedora = await prisma.mantenedora.upsert({
    where: { cnpj: '00000000000191' },
    update: {},
    create: {
      name: 'Associação COCRIS',
      cnpj: '00000000000191',
      email: 'contato@cocris.org.br',
      phone: '(61) 3333-4444',
      address: 'Brasília, DF',
    },
  });
  console.log('✅ Mantenedora:', mantenedora.name);

  // 2. Criar Unidade
  const unit = await prisma.unit.upsert({
    where: { cnpj: '00000000000191' },
    update: {},
    create: {
      cnpj: '00000000000191',
      nome: 'Unidade Piloto',
      endereco: 'Brasília, DF',
      telefone: '(61) 3333-4444',
      email: 'piloto@cocris.org.br',
      mantenedoraId: mantenedora.id,
    },
  });
  console.log('✅ Unidade:', unit.nome);

  // 3. Criar Turmas
  const turmaA = await prisma.classroom.upsert({
    where: { id: 'turma-a-001' },
    update: {},
    create: {
      id: 'turma-a-001',
      name: 'Turma A - Maternal',
      shift: 'MATUTINO',
      ageGroup: 'MATERNAL',
      capacity: 20,
      unitId: unit.id,
      mantenedoraId: mantenedora.id,
    },
  });

  const turmaB = await prisma.classroom.upsert({
    where: { id: 'turma-b-001' },
    update: {},
    create: {
      id: 'turma-b-001',
      name: 'Turma B - Jardim I',
      shift: 'VESPERTINO',
      ageGroup: 'JARDIM_I',
      capacity: 20,
      unitId: unit.id,
      mantenedoraId: mantenedora.id,
    },
  });

  const turmaC = await prisma.classroom.upsert({
    where: { id: 'turma-c-001' },
    update: {},
    create: {
      id: 'turma-c-001',
      name: 'Turma C - Jardim II',
      shift: 'INTEGRAL',
      ageGroup: 'JARDIM_II',
      capacity: 20,
      unitId: unit.id,
      mantenedoraId: mantenedora.id,
    },
  });
  console.log('✅ Turmas criadas: A, B, C');

  // Senha padrão para todos
  const password = await bcrypt.hash('Teste@123', 10);

  // 4. NÍVEL 1: DEVELOPER (1 usuário)
  const developer = await prisma.user.upsert({
    where: { email: 'developer@conexa.com' },
    update: {},
    create: {
      email: 'developer@conexa.com',
      name: 'Developer',
      password,
      roleLevel: 'DEVELOPER',
      roleType: 'ADMIN',
      mantenedoraId: mantenedora.id,
      unitId: unit.id,
    },
  });
  console.log('\n✅ NÍVEL 1 - DEVELOPER');
  console.log('   📧', developer.email);

  // 5. NÍVEL 2: MANTENEDORA (2 usuários)
  const adminMant = await prisma.user.upsert({
    where: { email: 'admin@mantenedora.com' },
    update: {},
    create: {
      email: 'admin@mantenedora.com',
      name: 'Admin Mantenedora',
      password,
      roleLevel: 'MANTENEDORA',
      roleType: 'ADMIN',
      mantenedoraId: mantenedora.id,
      unitId: unit.id,
    },
  });

  const financeiroMant = await prisma.user.upsert({
    where: { email: 'financeiro@mantenedora.com' },
    update: {},
    create: {
      email: 'financeiro@mantenedora.com',
      name: 'Financeiro Mantenedora',
      password,
      roleLevel: 'MANTENEDORA',
      roleType: 'FINANCEIRO',
      mantenedoraId: mantenedora.id,
      unitId: unit.id,
    },
  });
  console.log('\n✅ NÍVEL 2 - MANTENEDORA');
  console.log('   📧', adminMant.email);
  console.log('   📧', financeiroMant.email);

  // 6. NÍVEL 3: STAFF_CENTRAL (2 usuários)
  const coordCentral = await prisma.user.upsert({
    where: { email: 'coordenacao@central.com' },
    update: {},
    create: {
      email: 'coordenacao@central.com',
      name: 'Coordenação Central',
      password,
      roleLevel: 'STAFF_CENTRAL',
      roleType: 'PEDAGOGICO',
      mantenedoraId: mantenedora.id,
      unitId: unit.id,
    },
  });

  const psicoCentral = await prisma.user.upsert({
    where: { email: 'psicologia@central.com' },
    update: {},
    create: {
      email: 'psicologia@central.com',
      name: 'Psicologia Central',
      password,
      roleLevel: 'STAFF_CENTRAL',
      roleType: 'PSICOLOGIA',
      mantenedoraId: mantenedora.id,
      unitId: unit.id,
    },
  });
  console.log('\n✅ NÍVEL 3 - STAFF_CENTRAL');
  console.log('   📧', coordCentral.email);
  console.log('   📧', psicoCentral.email);

  // 7. NÍVEL 4: UNIDADE (4 usuários)
  const diretor = await prisma.user.upsert({
    where: { email: 'diretor@unidade1.com' },
    update: {},
    create: {
      email: 'diretor@unidade1.com',
      name: 'Diretor Unidade 1',
      password,
      roleLevel: 'UNIDADE',
      roleType: 'DIRETOR',
      mantenedoraId: mantenedora.id,
      unitId: unit.id,
    },
  });

  const coordPed = await prisma.user.upsert({
    where: { email: 'coordenador@unidade1.com' },
    update: {},
    create: {
      email: 'coordenador@unidade1.com',
      name: 'Coordenador Pedagógico',
      password,
      roleLevel: 'UNIDADE',
      roleType: 'COORDENADOR_PEDAGOGICO',
      mantenedoraId: mantenedora.id,
      unitId: unit.id,
    },
  });

  const administrativo = await prisma.user.upsert({
    where: { email: 'administrativo@unidade1.com' },
    update: {},
    create: {
      email: 'administrativo@unidade1.com',
      name: 'Administrativo',
      password,
      roleLevel: 'UNIDADE',
      roleType: 'ADMINISTRATIVO',
      mantenedoraId: mantenedora.id,
      unitId: unit.id,
    },
  });

  const nutricionista = await prisma.user.upsert({
    where: { email: 'nutricionista@unidade1.com' },
    update: {},
    create: {
      email: 'nutricionista@unidade1.com',
      name: 'Nutricionista',
      password,
      roleLevel: 'UNIDADE',
      roleType: 'NUTRICIONISTA',
      mantenedoraId: mantenedora.id,
      unitId: unit.id,
    },
  });
  console.log('\n✅ NÍVEL 4 - UNIDADE');
  console.log('   📧', diretor.email);
  console.log('   📧', coordPed.email);
  console.log('   📧', administrativo.email);
  console.log('   📧', nutricionista.email);

  // 8. NÍVEL 5: PROFESSOR (3 usuários)
  const prof1 = await prisma.user.upsert({
    where: { email: 'professor1@unidade1.com' },
    update: {},
    create: {
      email: 'professor1@unidade1.com',
      name: 'Professor Turma A',
      password,
      roleLevel: 'PROFESSOR',
      roleType: 'PROFESSOR',
      mantenedoraId: mantenedora.id,
      unitId: unit.id,
      classroomId: turmaA.id,
    },
  });

  const prof2 = await prisma.user.upsert({
    where: { email: 'professor2@unidade1.com' },
    update: {},
    create: {
      email: 'professor2@unidade1.com',
      name: 'Professor Turma B',
      password,
      roleLevel: 'PROFESSOR',
      roleType: 'PROFESSOR',
      mantenedoraId: mantenedora.id,
      unitId: unit.id,
      classroomId: turmaB.id,
    },
  });

  const prof3 = await prisma.user.upsert({
    where: { email: 'professor3@unidade1.com' },
    update: {},
    create: {
      email: 'professor3@unidade1.com',
      name: 'Professor Turma C',
      password,
      roleLevel: 'PROFESSOR',
      roleType: 'PROFESSOR',
      mantenedoraId: mantenedora.id,
      unitId: unit.id,
      classroomId: turmaC.id,
    },
  });
  console.log('\n✅ NÍVEL 5 - PROFESSOR');
  console.log('   📧', prof1.email, '(Turma A)');
  console.log('   📧', prof2.email, '(Turma B)');
  console.log('   📧', prof3.email, '(Turma C)');

  console.log('\n' + '='.repeat(60));
  console.log('🎉 SEED COMPLETO! 13 usuários criados');
  console.log('='.repeat(60));
  console.log('\n📋 SENHA PADRÃO PARA TODOS: Teste@123\n');
  console.log('📊 RESUMO:');
  console.log('   • 1 Mantenedora');
  console.log('   • 1 Unidade');
  console.log('   • 3 Turmas');
  console.log('   • 13 Usuários (5 níveis de acesso)');
  console.log('\n✅ Sistema pronto para uso!\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
