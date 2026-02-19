/**
 * Script para criar usuário administrador inicial
 * 
 * Uso:
 *   node scripts/create-admin.js
 * 
 * Ou com parâmetros:
 *   node scripts/create-admin.js admin@conexa.com Admin@123 Admin Sistema
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Parâmetros da linha de comando ou valores padrão
    const email = process.argv[2] || 'admin@conexa.com';
    const password = process.argv[3] || 'Admin@123';
    const firstName = process.argv[4] || 'Admin';
    const lastName = process.argv[5] || 'Sistema';

    console.log('🔐 Criando usuário administrador...');
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Nome: ${firstName} ${lastName}`);

    // Verificar se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('⚠️  Usuário já existe!');
      console.log('✅ Email:', existingUser.email);
      console.log('✅ Nome:', existingUser.firstName, existingUser.lastName);
      console.log('✅ Role:', existingUser.roleLevel);
      return;
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        roleLevel: 'DEVELOPER',
        isActive: true,
      },
    });

    console.log('✅ Usuário administrador criado com sucesso!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Senha:', password);
    console.log('👤 Nome:', admin.firstName, admin.lastName);
    console.log('🎯 Role:', admin.roleLevel);
    console.log('');
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
  } catch (error) {
    console.error('❌ Erro ao criar administrador:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
