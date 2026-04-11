import { PrismaClient, RoleLevel } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── CONFIGURAÇÃO — preencher antes de rodar ──────────────────────────────
const UNIT_ID        = process.env.UNIT_ID        || '';
const MANTENEDORA_ID = process.env.MANTENEDORA_ID || '';
const SENHA_PADRAO   = process.env.SENHA_PADRAO   || 'Conexa@2026';

const ARQUIVO_ALUNOS       = path.resolve(process.argv[2] || '');
const ARQUIVO_PROFISSIONAIS = path.resolve(process.argv[3] || '');
// ─────────────────────────────────────────────────────────────────────────

function normalizarNome(nome: string): { firstName: string; lastName: string } {
  const partes = nome.trim().split(' ').filter(Boolean);
  const firstName = partes[0] || '';
  const lastName  = partes.slice(1).join(' ') || '';
  return { firstName, lastName };
}

function normalizarSexo(sexo: string): 'MASCULINO' | 'FEMININO' | 'OUTRO' {
  const s = sexo?.trim().toUpperCase();
  if (s === 'MASCULINO' || s === 'M') return 'MASCULINO';
  if (s === 'FEMININO'  || s === 'F') return 'FEMININO';
  return 'OUTRO';
}

function normalizarTelefone(tel: string): string {
  return (tel || '').toString().trim().replace(/\s+/g, ' ');
}

function turmaParaAgeGroup(turma: string): { ageGroupMin: number; ageGroupMax: number } {
  const t = turma.trim().toUpperCase();
  if (t.includes('BERÇÁRIO I') && !t.includes('II')) return { ageGroupMin: 0,  ageGroupMax: 12 };
  if (t.includes('BERÇÁRIO II'))                      return { ageGroupMin: 13, ageGroupMax: 18 };
  if (t.includes('MATERNAL I') && !t.includes('II'))  return { ageGroupMin: 19, ageGroupMax: 47 };
  if (t.includes('MATERNAL II'))                      return { ageGroupMin: 48, ageGroupMax: 71 };
  return { ageGroupMin: 0, ageGroupMax: 71 };
}

function mapearRole(funcao: string): RoleLevel | null {
  const f = funcao.trim().toUpperCase();
  if (f.includes('PROFESSORA') || f.includes('PROFESSOR') || f.includes('MONITORA') || f.includes('MONITOR'))
    return RoleLevel.PROFESSOR;
  if (f.includes('COORDENADORA') || f.includes('COORDENADOR') || f.includes('DIRETORA') || f.includes('DIRETOR'))
    return RoleLevel.UNIDADE;
  if (f.includes('NUTRICIONISTA'))
    return RoleLevel.UNIDADE;
  if (f.includes('SECRETÁRIA') || f.includes('SECRETARIO') || f.includes('AUX. ADMINISTRATIVO'))
    return RoleLevel.UNIDADE;
  // Funções operacionais sem acesso ao sistema
  return null;
}

async function main() {
  if (!UNIT_ID || !MANTENEDORA_ID) {
    console.error('❌ Defina UNIT_ID e MANTENEDORA_ID como variáveis de ambiente.');
    process.exit(1);
  }

  console.log(`\n🚀 Iniciando importação`);
  console.log(`   Unidade:     ${UNIT_ID}`);
  console.log(`   Mantenedora: ${MANTENEDORA_ID}\n`);

  // ── 1. Verificar que a unidade existe ──────────────────────────────────
  const unidade = await prisma.unit.findUnique({ where: { id: UNIT_ID } });
  if (!unidade) {
    console.error(`❌ Unidade ${UNIT_ID} não encontrada no banco.`);
    process.exit(1);
  }
  console.log(`✅ Unidade encontrada: ${unidade.name}`);

  // ── 2. Ler planilhas ────────────────────────────────────────────────────
  const wbAlunos = XLSX.readFile(ARQUIVO_ALUNOS);
  const alunosRaw: any[] = XLSX.utils.sheet_to_json(
    wbAlunos.Sheets[wbAlunos.SheetNames[0]]
  );

  const wbProf = XLSX.readFile(ARQUIVO_PROFISSIONAIS);
  const profRaw: any[] = XLSX.utils.sheet_to_json(
    wbProf.Sheets[wbProf.SheetNames[0]]
  );

  console.log(`📋 ${alunosRaw.length} alunos e ${profRaw.length} profissionais encontrados.\n`);

  // ── 3. Criar turmas (upsert por unitId + code) ─────────────────────────
  console.log('── Importando turmas ──');
  const turmasUnicas = new Map<string, { professora: string }>();
  for (const row of alunosRaw) {
    const turma = (row['TURMA'] || '').toString().trim();
    const prof  = (row['PROFESSORA'] || '').toString().trim().toUpperCase();
    const chave = `${turma}::${prof}`;
    if (!turmasUnicas.has(chave)) {
      turmasUnicas.set(chave, { professora: prof });
    }
  }

  const turmaMap = new Map<string, string>(); // chave → classroomId
  for (const [chave, { professora }] of turmasUnicas) {
    const [nomeTurma] = chave.split('::');
    const code = `${nomeTurma.replace(/\s+/g, '-').toUpperCase()}-${professora.split(' ')[0]}`;
    const { ageGroupMin, ageGroupMax } = turmaParaAgeGroup(nomeTurma);
    const classroom = await prisma.classroom.upsert({
      where: { unitId_code: { unitId: UNIT_ID, code } },
      update: {},
      create: {
        unitId: UNIT_ID,
        name: `${nomeTurma} — ${professora.split(' ')[0]}`,
        code,
        ageGroupMin,
        ageGroupMax,
        capacity: 30,
        isActive: true,
        createdBy: 'importacao',
      },
    });
    turmaMap.set(chave, classroom.id);
    console.log(`  ✅ Turma: ${classroom.name} (${classroom.id})`);
  }

  // ── 4. Importar alunos ─────────────────────────────────────────────────
  console.log('\n── Importando alunos ──');
  let criados = 0, atualizados = 0, erros = 0;

  for (const row of alunosRaw) {
    try {
      const nome    = (row['NOME'] || '').toString().trim();
      const cpf     = (row['CPF']  || '').toString().trim();
      const turma   = (row['TURMA']     || '').toString().trim();
      const prof    = (row['PROFESSORA']|| '').toString().trim().toUpperCase();
      const chave   = `${turma}::${prof}`;
      const classroomId = turmaMap.get(chave);

      if (!nome || !cpf || !classroomId) {
        console.warn(`  ⚠️  Pulando linha sem dados essenciais: ${nome}`);
        erros++;
        continue;
      }

      const { firstName, lastName } = normalizarNome(nome);
      const dateOfBirth = new Date(row['NASC']);

      const childData = {
        mantenedoraId: MANTENEDORA_ID,
        unitId: UNIT_ID,
        firstName,
        lastName,
        dateOfBirth,
        gender: normalizarSexo(row['SEXO'] || ''),
        cpf,
        bloodType:  (row['TIPAGEM SANGUINEA'] || '').toString().trim() || null,
        raca:       (row['RAÇA']    || '').toString().trim() || null,
        peso:       (row['PESO']    || '').toString().trim() || null,
        celPai:     normalizarTelefone(row['CEL. PAI'] || '') || null,
        emergencyContactName:  (row['RESPONSÁVEL'] || row['MÃE'] || '').toString().trim() || null,
        emergencyContactPhone: normalizarTelefone(row['CEL. MÃE'] || '') || null,
        isActive: true,
        createdBy: 'importacao',
        updatedBy: 'importacao',
      };

      const child = await prisma.child.upsert({
        where: { cpf },
        create: childData,
        update: {
          firstName,
          lastName,
          dateOfBirth,
          gender: childData.gender,
          bloodType: childData.bloodType,
          raca:      childData.raca,
          peso:      childData.peso,
          celPai:    childData.celPai,
          updatedBy: 'importacao',
        },
      });

      // Matrícula
      await prisma.enrollment.upsert({
        where: { childId_classroomId: { childId: child.id, classroomId } },
        create: {
          childId:        child.id,
          classroomId,
          enrollmentDate: new Date(),
          status:         'ATIVA',
          createdBy:      'importacao',
        },
        update: { status: 'ATIVA' },
      });

      criados++;
      if (criados % 20 === 0) console.log(`  ... ${criados} alunos processados`);
    } catch (e: any) {
      console.error(`  ❌ Erro no aluno ${row['NOME']}: ${e.message}`);
      erros++;
    }
  }
  console.log(`\n  ✅ Alunos: ${criados} importados, ${erros} erros\n`);

  // ── 5. Importar profissionais ──────────────────────────────────────────
  console.log('── Importando profissionais ──');
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
  let usersCreated = 0, usersSem = 0;

  // Buscar Role padrão para PROFESSOR e UNIDADE desta mantenedora
  const roleProfessor = await prisma.role.findFirst({
    where: { mantenedoraId: MANTENEDORA_ID, level: RoleLevel.PROFESSOR, isActive: true },
  });
  const roleUnidade = await prisma.role.findFirst({
    where: { mantenedoraId: MANTENEDORA_ID, level: RoleLevel.UNIDADE, isActive: true },
  });

  for (const row of profRaw) {
    const funcao = (row['FUNÇÃO'] || '').toString().trim();
    const nome   = (row['NOME']   || '').toString().trim();
    const email  = (row['E-MAIL'] || '').toString().trim().toLowerCase().replace(/\s+/g, '');
    const tel    = normalizarTelefone(row['TELEFONE'] || '');

    const level = mapearRole(funcao);
    if (!level) {
      console.log(`  ℹ️  ${nome} (${funcao}) — sem acesso ao sistema, pulado`);
      usersSem++;
      continue;
    }

    if (!email || !email.includes('@')) {
      console.warn(`  ⚠️  ${nome} — e-mail inválido: "${email}", pulado`);
      usersSem++;
      continue;
    }

    try {
      const { firstName, lastName } = normalizarNome(nome);
      const roleId = level === RoleLevel.PROFESSOR ? roleProfessor?.id : roleUnidade?.id;

      const user = await prisma.user.upsert({
        where: { email },
        create: {
          mantenedoraId: MANTENEDORA_ID,
          unitId:        UNIT_ID,
          email,
          password:      senhaHash,
          firstName,
          lastName,
          phone:         tel || null,
          status:        'ATIVO',
          createdBy:     'importacao',
          updatedBy:     'importacao',
        },
        update: {
          firstName,
          lastName,
          phone:     tel || null,
          updatedBy: 'importacao',
        },
      });

      // Criar UserRole se ainda não existir
      if (roleId) {
        const existingRole = await prisma.userRole.findUnique({
          where: { userId_roleId: { userId: user.id, roleId } },
        });
        if (!existingRole) {
          await prisma.userRole.create({
            data: {
              userId:     user.id,
              roleId,
              scopeLevel: level,
              isActive:   true,
            },
          });
        }
      }

      // Vincular professor à turma pelo nome
      if (level === RoleLevel.PROFESSOR) {
        const primeiroNome = firstName.toUpperCase();
        for (const [chave, classroomId] of turmaMap) {
          const profDaTurma = chave.split('::')[1];
          if (profDaTurma.startsWith(primeiroNome)) {
            await prisma.classroomTeacher.upsert({
              where: { classroomId_teacherId: { classroomId, teacherId: user.id } },
              create: {
                classroomId,
                teacherId: user.id,
                role:      'MAIN',
                isActive:  true,
              },
              update: { isActive: true },
            });
          }
        }
      }

      usersCreated++;
      console.log(`  ✅ ${nome} (${funcao}) → ${level}`);
    } catch (e: any) {
      console.error(`  ❌ Erro em ${nome}: ${e.message}`);
    }
  }

  console.log(`\n  ✅ Profissionais: ${usersCreated} importados, ${usersSem} sem acesso ao sistema`);
  console.log(`\n🎉 Importação concluída!\n`);
  console.log(`📌 Senha padrão para todos os usuários: ${SENHA_PADRAO}`);
  console.log(`   Oriente cada profissional a trocar a senha no primeiro acesso.\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
