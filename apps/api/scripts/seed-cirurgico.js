#!/usr/bin/env node
/**
 * SEED CIRÚRGICO - 100% ALINHADO COM SCHEMA PRISMA
 * User NÃO tem campo 'role' - usa relacionamento 'roles' via UserRole
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
  console.log('🔥 LIMPANDO BANCO...\n');

  // Ordem correta respeitando foreign keys
  await prisma.userRole.deleteMany({});
  await prisma.classroomTeacher.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.child.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.classroom.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.mantenedora.deleteMany({});
  
  console.log('✅ Banco limpo\n');

  const senhaHash = await bcrypt.hash('Teste@123', 10);

  // 1. Mantenedora
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
  console.log('✅ Mantenedora');

  // 2. Criar Roles (necessário para UserRole)
  const roleDev = await prisma.role.create({
    data: {
      mantenedoraId: mantenedora.id,
      name: 'Developer',
      level: 'DEVELOPER',
      type: 'DEVELOPER',
    },
  });

  const roleMant = await prisma.role.create({
    data: {
      mantenedoraId: mantenedora.id,
      name: 'Admin Mantenedora',
      level: 'MANTENEDORA',
      type: 'MANTENEDORA_ADMIN',
    },
  });

  const roleStaff = await prisma.role.create({
    data: {
      mantenedoraId: mantenedora.id,
      name: 'Staff Central',
      level: 'STAFF_CENTRAL',
      type: 'STAFF_CENTRAL_PEDAGOGICO',
    },
  });

  const roleUnidade = await prisma.role.create({
    data: {
      mantenedoraId: mantenedora.id,
      name: 'Coordenador Unidade',
      level: 'UNIDADE',
      type: 'UNIDADE_COORDENADOR_PEDAGOGICO',
    },
  });

  const roleProf = await prisma.role.create({
    data: {
      mantenedoraId: mantenedora.id,
      name: 'Professor',
      level: 'PROFESSOR',
      type: 'PROFESSOR',
    },
  });

  console.log('✅ Roles criados');

  // 3. Unidade
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
  console.log('✅ Unidade');

  // 4. Turmas
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
  console.log(`✅ ${turmasData.length} Turmas`);

  // 5. Professoras
  const professorasNomes = [...new Set(turmasData.map(t => t.professora))];
  const professoresMap = {}; // nome -> userId
  
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
      },
    });

    // Criar UserRole
    await prisma.userRole.create({
      data: {
        userId: prof.id,
        roleId: roleProf.id,
        scopeLevel: 'PROFESSOR',
      },
    });
    professoresMap[nome] = prof.id;
  }
  // Vincular professoras às turmas via ClassroomTeacher
  for (const turmaData of turmasData) {
    const turmaInfo = turmasMap[turmaData.codigo];
    const profId = professoresMap[turmaData.professora];
    if (turmaInfo && profId) {
      await prisma.classroomTeacher.create({
        data: {
          classroomId: turmaInfo.id,
          teacherId: profId,
          role: 'MAIN',
          isActive: true,
        },
      });
    }
  }
  console.log(`✅ ${professorasNomes.length} Professoras vinculadas às turmas`);

  // 6. Alunos + Matrículas
  let totalAlunos = 0;
  for (const [codigo, turmaInfo] of Object.entries(turmasMap)) {
    for (const alunoData of turmaInfo.alunos) {
      const [firstName, ...lastNameParts] = alunoData.nome.split(' ');
      const lastName = lastNameParts.join(' ') || 'Silva';
      
      const child = await prisma.child.create({
        data: {
          mantenedoraId: mantenedora.id,
          unitId: unit.id,
          firstName,
          lastName,
          dateOfBirth: new Date(alunoData.nascimento),
          gender: alunoData.sexo === 'M' ? 'MASCULINO' : 'FEMININO',
        },
      });
      // Criar matrícula na turma
      await prisma.enrollment.create({
        data: {
          childId: child.id,
          classroomId: turmaInfo.id,
          enrollmentDate: new Date('2026-02-01'),
          status: 'ATIVA',
        },
      });
      totalAlunos++;
    }
  }
  console.log(`✅ ${totalAlunos} Alunos matriculados nas turmas`);

  // 7. Usuários administrativos
  const userDev = await prisma.user.create({
    data: {
      email: 'developer@conexa.com',
      password: senhaHash,
      firstName: 'Developer',
      lastName: 'Conexa',
      mantenedoraId: mantenedora.id,
    },
  });
  await prisma.userRole.create({
    data: { userId: userDev.id, roleId: roleDev.id, scopeLevel: 'DEVELOPER' },
  });

  const userAdmin = await prisma.user.create({
    data: {
      email: 'admin@cocris.org.br',
      password: senhaHash,
      firstName: 'Administrador',
      lastName: 'COCRIS',
      mantenedoraId: mantenedora.id,
    },
  });
  await prisma.userRole.create({
    data: { userId: userAdmin.id, roleId: roleMant.id, scopeLevel: 'MANTENEDORA' },
  });

  const userPed = await prisma.user.create({
    data: {
      email: 'pedagogico@cocris.org.br',
      password: senhaHash,
      firstName: 'Coordenação',
      lastName: 'Pedagógica',
      mantenedoraId: mantenedora.id,
    },
  });
  await prisma.userRole.create({
    data: { userId: userPed.id, roleId: roleStaff.id, scopeLevel: 'STAFF_CENTRAL' },
  });

  const userCoord = await prisma.user.create({
    data: {
      email: 'coordenador@cepi.com.br',
      password: senhaHash,
      firstName: 'Coordenador',
      lastName: 'CEPI Arara',
      mantenedoraId: mantenedora.id,
      unitId: unit.id,
    },
  });
  await prisma.userRole.create({
    data: { userId: userCoord.id, roleId: roleUnidade.id, scopeLevel: 'UNIDADE' },
  });

  console.log('✅ Admins criados');

  console.log('\n🎉 SEED COMPLETO!');
  console.log(`\n📊 RESUMO:`);
  console.log(`   - 1 Mantenedora`);
  console.log(`   - 1 Unidade`);
  console.log(`   - ${turmasData.length} Turmas`);
  console.log(`   - ${totalAlunos} Alunos`);
  console.log(`   - ${professorasNomes.length + 4} Usuários`);
  console.log(`\n🔑 Login: email / Teste@123`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
