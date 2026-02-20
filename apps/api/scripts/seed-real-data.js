#!/usr/bin/env node
/**
 * Seed com dados REAIS da planilha ALUNOS2026.xlsx
 * - 1 Mantenedora: Associação COCRIS
 * - 1 Unidade: CEPI Arara Canindé
 * - 9 Turmas reais com 170 alunos
 * - 9 Professoras + 1 Developer + 2 Admin Mantenedora + 2 Staff Central + 2 Coordenadores
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Ler dados extraídos
const turmasData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../datasets/turmas_alunos.json'), 'utf-8')
);

async function main() {
  console.log('🌱 Seed REAL - CEPI Arara Canindé 2026\n');

  // Senha padrão para todos
  const senhaHash = await bcrypt.hash('Teste@123', 10);

  // 1. Criar Mantenedora
  const mantenedora = await prisma.mantenedora.upsert({
    where: { id: 'mant-cocris-001' },
    update: {},
    create: {
      id: 'mant-cocris-001',
      name: 'Associação COCRIS',
      cnpj: '00.000.000/0001-00',
      email: 'contato@cocris.org.br',
      phone: '(61) 3333-3333',
      address: 'Brasília - DF',
      city: 'Brasília',
      state: 'DF',
    },
  });
  console.log('✅ Mantenedora: Associação COCRIS');

  // 2. Criar Unidade
  const unit = await prisma.unit.upsert({
    where: { id: 'unit-arara-caninde' },
    update: {},
    create: {
      id: 'unit-arara-caninde',
      mantenedoraId: mantenedora.id,
      name: 'CEPI Arara Canindé',
      code: 'ARARA-CANINDE',
      address: 'Quadra 100, Conjunto A',
      city: 'Brasília',
      state: 'DF',
      email: 'arara.caninde@cocris.org.br',
      phone: '(61) 3344-5566',
    },
  });
  console.log('✅ Unidade: CEPI Arara Canindé');

  // 3. Criar Turmas e mapear IDs
  const turmasMap = {};
  
  for (const turmaData of turmasData) {
    const turmaId = `turma-${turmaData.codigo.toLowerCase().replace(/_/g, '-')}`;
    
    // Determinar faixa etária baseada no nome
    let ageMin = 0, ageMax = 12;
    if (turmaData.nome.includes('BERÇARIO I')) {
      ageMin = 0; ageMax = 11;
    } else if (turmaData.nome.includes('BERÇARIO II')) {
      ageMin = 12; ageMax = 23;
    } else if (turmaData.nome.includes('MATERNAL I')) {
      ageMin = 24; ageMax = 35;
    } else if (turmaData.nome.includes('MATERNAL II')) {
      ageMin = 36; ageMax = 47;
    }
    
    const turma = await prisma.classroom.upsert({
      where: { id: turmaId },
      update: {},
      create: {
        id: turmaId,
        unitId: unit.id,
        name: turmaData.nome,
        code: turmaData.codigo,
        ageGroupMin: ageMin,
        ageGroupMax: ageMax,
        capacity: turmaData.total_alunos + 5, // +5 de margem
      },
    });
    
    turmasMap[turmaData.codigo] = {
      id: turma.id,
      professora: turmaData.professora,
      alunos: turmaData.alunos
    };
  }
  console.log(`✅ ${turmasData.length} Turmas criadas`);

  // 4. Criar Professoras (uma para cada turma)
  const professoras = {};
  const professorasNomes = [...new Set(turmasData.map(t => t.professora))];
  
  for (const nome of professorasNomes) {
    const email = `${nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@cepi.com.br`;
    const [firstName, ...lastNameParts] = nome.split(' ');
    const lastName = lastNameParts.join(' ') || 'Silva';
    
    const prof = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: senhaHash,
        firstName,
        lastName,
        mantenedoraId: mantenedora.id,
        unitId: unit.id,
        role: 'PROFESSOR',
        isActive: true,
      },
    });
    
    professoras[nome] = prof.id;
  }
  console.log(`✅ ${professorasNomes.length} Professoras criadas`);

  // 5. Criar Alunos
  let totalAlunos = 0;
  
  for (const [codigo, turmaInfo] of Object.entries(turmasMap)) {
    for (const alunoData of turmaInfo.alunos) {
      const [firstName, ...lastNameParts] = alunoData.nome.split(' ');
      const lastName = lastNameParts.join(' ') || 'Silva';
      
      await prisma.child.create({
        data: {
          mantenedoraId: mantenedora.id,
          unitId: unit.id,
          firstName,
          lastName,
          dateOfBirth: new Date(alunoData.nascimento),
          gender: alunoData.sexo === 'M' ? 'MASCULINO' : 'FEMININO',
        },
      });
      
      totalAlunos++;
    }
  }
  console.log(`✅ ${totalAlunos} Alunos criados`);

  // 6. Criar usuários administrativos
  
  // Developer
  await prisma.user.upsert({
    where: { email: 'developer@conexa.com' },
    update: {},
    create: {
      email: 'developer@conexa.com',
      password: senhaHash,
      firstName: 'Developer',
      lastName: 'Conexa',
      mantenedoraId: mantenedora.id,
      role: 'DEVELOPER',
      isActive: true,
    },
  });

  // Admin Mantenedora
  await prisma.user.upsert({
    where: { email: 'admin@cocris.org.br' },
    update: {},
    create: {
      email: 'admin@cocris.org.br',
      password: senhaHash,
      firstName: 'Administrador',
      lastName: 'COCRIS',
      mantenedoraId: mantenedora.id,
      role: 'MANTENEDORA',
      isActive: true,
    },
  });

  // Staff Central
  await prisma.user.upsert({
    where: { email: 'pedagogico@cocris.org.br' },
    update: {},
    create: {
      email: 'pedagogico@cocris.org.br',
      password: senhaHash,
      firstName: 'Coordenação',
      lastName: 'Pedagógica',
      mantenedoraId: mantenedora.id,
      role: 'STAFF_CENTRAL',
      isActive: true,
    },
  });

  // Coordenador Unidade
  await prisma.user.upsert({
    where: { email: 'coordenador@cepi.com.br' },
    update: {},
    create: {
      email: 'coordenador@cepi.com.br',
      password: senhaHash,
      firstName: 'Coordenador',
      lastName: 'CEPI Arara',
      mantenedoraId: mantenedora.id,
      unitId: unit.id,
      role: 'UNIDADE',
      isActive: true,
    },
  });

  console.log('✅ Usuários administrativos criados');

  console.log('\n🎉 SEED COMPLETO!');
  console.log('\n📊 RESUMO:');
  console.log(`   - 1 Mantenedora`);
  console.log(`   - 1 Unidade`);
  console.log(`   - ${turmasData.length} Turmas`);
  console.log(`   - ${totalAlunos} Alunos`);
  console.log(`   - ${professorasNomes.length + 4} Usuários`);
  console.log('\n🔑 Login: email / senha: Teste@123');
  console.log('   - developer@conexa.com');
  console.log('   - admin@cocris.org.br');
  console.log('   - pedagogico@cocris.org.br');
  console.log('   - coordenador@cepi.com.br');
  console.log('   - [professora]@cepi.com.br (ex: nonata@cepi.com.br)');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
