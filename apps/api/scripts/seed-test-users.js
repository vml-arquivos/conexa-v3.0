/**
 * Script para criar usuários de teste com todos os níveis de acesso
 * 
 * Níveis de Acesso:
 * 1. DEVELOPER - Acesso total ao sistema
 * 2. MANTENEDORA - Gestão administrativa global (relatórios, compras, unidades, funcionários)
 * 3. STAFF_CENTRAL - Coordenação pedagógica geral (todas as unidades, RDI, RIA, diários)
 * 4. UNIDADE - Gestão local (diretor, coordenador, administrativo, nutricionista)
 * 5. PROFESSOR - Acesso à turma (diário de bordo, micro-gestos, relatórios, templates IA)
 * 
 * Uso:
 *   node scripts/seed-test-users.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Senha padrão para todos os usuários de teste
const DEFAULT_PASSWORD = 'Teste@123';

// Usuários de teste
const TEST_USERS = [
  // ============================================================================
  // NÍVEL 1: DEVELOPER (Acesso Total)
  // ============================================================================
  {
    email: 'developer@conexa.com',
    password: DEFAULT_PASSWORD,
    firstName: 'Developer',
    lastName: 'Sistema',
    roleLevel: 'DEVELOPER',
    specificRole: null,
    description: 'Acesso sistêmico total - Desenvolvimento e manutenção',
  },

  // ============================================================================
  // NÍVEL 2: MANTENEDORA (Gestão Administrativa Global)
  // ============================================================================
  {
    email: 'admin@mantenedora.com',
    password: DEFAULT_PASSWORD,
    firstName: 'Administrador',
    lastName: 'Geral',
    roleLevel: 'MANTENEDORA',
    specificRole: 'ADMIN',
    description: 'Gestão administrativa completa - Relatórios, compras, unidades, funcionários',
  },
  {
    email: 'financeiro@mantenedora.com',
    password: DEFAULT_PASSWORD,
    firstName: 'Financeiro',
    lastName: 'Mantenedora',
    roleLevel: 'MANTENEDORA',
    specificRole: 'FINANCEIRO',
    description: 'Gestão financeira - Pedidos de compra, fornecedores, orçamentos',
  },

  // ============================================================================
  // NÍVEL 3: STAFF_CENTRAL (Coordenação Pedagógica Geral)
  // ============================================================================
  {
    email: 'coordenacao@central.com',
    password: DEFAULT_PASSWORD,
    firstName: 'Coordenadora',
    lastName: 'Geral',
    roleLevel: 'STAFF_CENTRAL',
    specificRole: 'PEDAGOGICO',
    description: 'Coordenação pedagógica de todas as unidades - RDI, RIA, diários, relatórios',
  },
  {
    email: 'psicologia@central.com',
    password: DEFAULT_PASSWORD,
    firstName: 'Psicóloga',
    lastName: 'Central',
    roleLevel: 'STAFF_CENTRAL',
    specificRole: 'PSICOLOGIA',
    description: 'Apoio psicológico - Acompanhamento de desenvolvimento, padrões comportamentais',
  },

  // ============================================================================
  // NÍVEL 4: UNIDADE (Gestão Local)
  // ============================================================================
  {
    email: 'diretor@unidade1.com',
    password: DEFAULT_PASSWORD,
    firstName: 'Diretor',
    lastName: 'Unidade 1',
    roleLevel: 'UNIDADE',
    specificRole: 'DIRETOR',
    description: 'Direção da unidade - Gestão geral, relatórios, equipe',
  },
  {
    email: 'coordenador@unidade1.com',
    password: DEFAULT_PASSWORD,
    firstName: 'Coordenadora',
    lastName: 'Pedagógica',
    roleLevel: 'UNIDADE',
    specificRole: 'COORDENADOR_PEDAGOGICO',
    description: 'Coordenação pedagógica da unidade - Planejamentos, diários, professores',
  },
  {
    email: 'administrativo@unidade1.com',
    password: DEFAULT_PASSWORD,
    firstName: 'Secretário',
    lastName: 'Administrativo',
    roleLevel: 'UNIDADE',
    specificRole: 'ADMINISTRATIVO',
    description: 'Secretaria administrativa - Matrículas, documentos, atendimento aos pais',
  },
  {
    email: 'nutricionista@unidade1.com',
    password: DEFAULT_PASSWORD,
    firstName: 'Nutricionista',
    lastName: 'Unidade 1',
    roleLevel: 'UNIDADE',
    specificRole: 'NUTRICIONISTA',
    description: 'Nutrição - Cardápios, dietas restritivas, pedidos de alimentos',
  },

  // ============================================================================
  // NÍVEL 5: PROFESSOR (Acesso à Turma)
  // ============================================================================
  {
    email: 'professor1@unidade1.com',
    password: DEFAULT_PASSWORD,
    firstName: 'Professora',
    lastName: 'Turma A',
    roleLevel: 'PROFESSOR',
    specificRole: 'PROFESSOR',
    description: 'Professor - Diário de bordo, micro-gestos, relatórios, templates IA, modo offline',
  },
  {
    email: 'professor2@unidade1.com',
    password: DEFAULT_PASSWORD,
    firstName: 'Professor',
    lastName: 'Turma B',
    roleLevel: 'PROFESSOR',
    specificRole: 'PROFESSOR',
    description: 'Professor - Diário de bordo, micro-gestos, relatórios, templates IA, modo offline',
  },
  {
    email: 'professor3@unidade1.com',
    password: DEFAULT_PASSWORD,
    firstName: 'Professora',
    lastName: 'Turma C',
    roleLevel: 'PROFESSOR',
    specificRole: 'PROFESSOR',
    description: 'Professor - Diário de bordo, micro-gestos, relatórios, templates IA, modo offline',
  },
];

async function seedTestUsers() {
  try {
    console.log('🌱 Iniciando seed de usuários de teste...\n');

    // Hash da senha padrão
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    let created = 0;
    let skipped = 0;

    for (const userData of TEST_USERS) {
      // Verificar se usuário já existe
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`⏭️  Usuário já existe: ${userData.email}`);
        skipped++;
        continue;
      }

      // Criar usuário
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          roleLevel: userData.roleLevel,
          specificRole: userData.specificRole,
          isActive: true,
        },
      });

      console.log(`✅ Criado: ${userData.email}`);
      console.log(`   Nome: ${user.firstName} ${user.lastName}`);
      console.log(`   Nível: ${user.roleLevel}`);
      console.log(`   Papel: ${user.specificRole || 'N/A'}`);
      console.log(`   Descrição: ${userData.description}`);
      console.log('');

      created++;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Seed concluído!`);
    console.log(`   Criados: ${created}`);
    console.log(`   Já existiam: ${skipped}`);
    console.log(`   Total: ${TEST_USERS.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 CREDENCIAIS DE ACESSO:\n');
    console.log('   Senha padrão para todos: Teste@123\n');
    console.log('   NÍVEL 1 - DEVELOPER:');
    console.log('   • developer@conexa.com\n');
    console.log('   NÍVEL 2 - MANTENEDORA:');
    console.log('   • admin@mantenedora.com (Admin)');
    console.log('   • financeiro@mantenedora.com (Financeiro)\n');
    console.log('   NÍVEL 3 - STAFF_CENTRAL:');
    console.log('   • coordenacao@central.com (Pedagógico)');
    console.log('   • psicologia@central.com (Psicologia)\n');
    console.log('   NÍVEL 4 - UNIDADE:');
    console.log('   • diretor@unidade1.com (Diretor)');
    console.log('   • coordenador@unidade1.com (Coordenador Pedagógico)');
    console.log('   • administrativo@unidade1.com (Administrativo)');
    console.log('   • nutricionista@unidade1.com (Nutricionista)\n');
    console.log('   NÍVEL 5 - PROFESSOR:');
    console.log('   • professor1@unidade1.com (Turma A)');
    console.log('   • professor2@unidade1.com (Turma B)');
    console.log('   • professor3@unidade1.com (Turma C)\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('⚠️  IMPORTANTE:');
    console.log('   1. Altere as senhas após o primeiro login');
    console.log('   2. Estes usuários são apenas para TESTE');
    console.log('   3. NÃO use em produção com dados reais');
    console.log('   4. Crie usuários reais com dados verdadeiros\n');

  } catch (error) {
    console.error('❌ Erro ao criar usuários de teste:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar seed
seedTestUsers()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
