const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Criando estrutura inicial...\n');

  // 1. Criar Mantenedora
  const mantenedora = await prisma.mantenedora.upsert({
    where: { cnpj: '00000000000191' },
    update: {},
    create: {
      cnpj: '00000000000191',
      razaoSocial: 'Associação COCRIS',
      nomeFantasia: 'COCRIS',
      email: 'contato@cocris.org.br',
      telefone: '(61) 3333-4444',
      endereco: 'Brasília, DF',
    },
  });
  console.log('✅ Mantenedora criada:', mantenedora.nomeFantasia);

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
  console.log('✅ Unidade criada:', unit.nome);

  // 3. Criar Admin Developer
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@conexa.com' },
    update: {},
    create: {
      email: 'admin@conexa.com',
      name: 'Administrador',
      password: hashedPassword,
      roleLevel: 'DEVELOPER',
      roleType: 'ADMIN',
      mantenedoraId: mantenedora.id,
      unitId: unit.id,
    },
  });
  console.log('✅ Admin criado:', admin.email);
  console.log('\n📋 CREDENCIAIS:');
  console.log('   Email: admin@conexa.com');
  console.log('   Senha: Admin@123');
  console.log('\n🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
