#!/usr/bin/env node
/**
 * SEED FRESH - LIMPA TUDO E POPULA DO ZERO
 * Sem erros de constraint, sem negociação
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const turmasData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../datasets/turmas_alunos.json'), 'utf-8')
);

async function main() {
  console.log('🔥 LIMPANDO BANCO DE DADOS...\n');

  // DELETAR TUDO NA ORDEM CORRETA (respeitar foreign keys)
  await prisma.child.deleteMany({});
  console.log('✅ Children deletados');
  
  await prisma.user.deleteMany({});
  console.log('✅ Users deletados');
  
  await prisma.classroom.deleteMany({});
  console.log('✅ Classrooms deletados');
  
  await prisma.unit.deleteMany({});
  console.log('✅ Units deletados');
  
  await prisma.mantenedora.deleteMany({});
  console.log('✅ Mantenedoras deletados');

  console.log('\n🌱 POPULANDO COM DADOS REAIS...\n');

  const senhaHash = await bcrypt.hash('Teste@123', 10);

  // 1. Criar Mantenedora
  const mantenedora = await prisma.mantenedora.create({
    data: {
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
  console.log('✅ Mantenedora criada');

  // 2. Criar Unidade
  const unit = await prisma.unit.create({
    data: {
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
  console.log('✅ Unidade criada');

  // 3. Criar Turmas
  const turmasMap = {};
  
  for (const turmaData of turmasData) {
    const turmaId = `turma-${turmaData.codigo.toLowerCase().replace(/_/g, '-')}`;
    
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
    
    const turma = await prisma.classroom.create({
      data: {
        id: turmaId,
        unitId: unit.id,
        name: turmaData.nome,
        code: turmaData.codigo,
        ageGroupMin: ageMin,
        ageGroupMax: ageMax,
        capacity: turmaData.total_alunos + 5,
      },
    });
    
    turmasMap[turmaData.codigo] = {
      id: turma.id,
      professora: turmaData.professora,
      alunos: turmaData.alunos
    };
  }
  console.log(`✅ ${turmasData.length} Turmas criadas`);

  // 4. Criar Professoras
  const professoras = {};
  const professorasNomes = [...new Set(turmasData.map(t => t.professora))];
  
  for (const nome of professorasNomes) {
    const email = `${nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@cepi.com.br`;
    const [firstName, ...lastNameParts] = nome.split(' ');
    const lastName = lastNameParts.join(' ') || 'Silva';
    
    const prof = await prisma.user.create({
      data: {
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
  await prisma.user.create({
    data: {
      email: 'developer@conexa.com',
      password: senhaHash,
      firstName: 'Developer',
      lastName: 'Conexa',
      mantenedoraId: mantenedora.id,
      role: 'DEVELOPER',
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      email: 'admin@cocris.org.br',
      password: senhaHash,
      firstName: 'Administrador',
      lastName: 'COCRIS',
      mantenedoraId: mantenedora.id,
      role: 'MANTENEDORA',
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      email: 'pedagogico@cocris.org.br',
      password: senhaHash,
      firstName: 'Coordenação',
      lastName: 'Pedagógica',
      mantenedoraId: mantenedora.id,
      role: 'STAFF_CENTRAL',
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
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
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
