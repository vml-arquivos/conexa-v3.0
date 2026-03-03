/**
 * ensure-matriz-segments.js
 *
 * Garante que existam matrizes ativas EI01, EI02, EI03 para 2026,
 * clonando entries de EI01 para EI02/EI03 de forma idempotente.
 *
 * Uso dentro do container:
 *   node /app/scripts/ensure-matriz-segments.js
 *   MANTENEDORA_ID=<id> node /app/scripts/ensure-matriz-segments.js
 *
 * Compatível com o schema atual (sem code/ageGroupMin/startDate).
 */
'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const YEAR = 2026;
const SEGMENTS = ['EI01', 'EI02', 'EI03'];
const SEGMENT_LABELS = {
  EI01: 'Berçário (EI01) — 0 a 18 meses',
  EI02: 'Maternal (EI02) — 19 a 47 meses',
  EI03: 'Pré-Escola (EI03) — 48 a 71 meses',
};

async function main() {
  console.log('🔍 ensure-matriz-segments.js — iniciando...\n');

  // ── 1. Encontrar a mantenedora ──────────────────────────────────────────────
  let mantenedoraId = process.env.MANTENEDORA_ID;

  if (!mantenedoraId) {
    // Tenta buscar por nome "Conexa" ou qualquer variação
    let mantenedora = await prisma.mantenedora.findFirst({
      where: { name: { contains: 'Conexa', mode: 'insensitive' } },
    });
    if (!mantenedora) {
      // Fallback: primeira mantenedora ativa
      mantenedora = await prisma.mantenedora.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }
    if (!mantenedora) {
      console.error('❌ Nenhuma mantenedora encontrada no banco. Abortando.');
      process.exit(1);
    }
    mantenedoraId = mantenedora.id;
    console.log(`✅ Mantenedora: ${mantenedora.name} (${mantenedoraId})\n`);
  } else {
    console.log(`✅ Usando MANTENEDORA_ID do ambiente: ${mantenedoraId}\n`);
  }

  // ── 2. Listar matrizes existentes para 2026 ────────────────────────────────
  const existingMatrices = await prisma.curriculumMatrix.findMany({
    where: { mantenedoraId, year: YEAR },
    select: { id: true, name: true, segment: true, isActive: true, description: true, version: true },
  });

  console.log(`📊 Matrizes 2026 encontradas: ${existingMatrices.length}`);
  existingMatrices.forEach(m =>
    console.log(`   - ${m.segment}: "${m.name}" (ativa: ${m.isActive}, id: ${m.id})`)
  );
  console.log('');

  // ── 3. Verificar se EI01 existe como fonte ─────────────────────────────────
  const sourceMatrix = existingMatrices.find(m => m.segment === 'EI01' && m.isActive);
  if (!sourceMatrix) {
    // Tentar qualquer EI01 (mesmo inativa)
    const anyEI01 = existingMatrices.find(m => m.segment === 'EI01');
    if (!anyEI01) {
      console.error('❌ Nenhuma matriz EI01 encontrada para 2026.');
      console.error('   Execute primeiro: node /app/scripts/seed-curriculum-ei01.js');
      console.error('   (ou verifique se o seed da Matriz foi executado)');
      process.exit(1);
    }
    // Ativar a EI01 inativa
    await prisma.curriculumMatrix.update({ where: { id: anyEI01.id }, data: { isActive: true } });
    console.log(`⚠️  EI01 estava inativa — ativada: ${anyEI01.name}`);
    anyEI01.isActive = true;
    Object.assign(sourceMatrix || {}, anyEI01);
  }

  const source = sourceMatrix || existingMatrices.find(m => m.segment === 'EI01');
  console.log(`✅ Matriz fonte (EI01): "${source.name}" (${source.id})\n`);

  // ── 4. Buscar entries da EI01 ──────────────────────────────────────────────
  const sourceEntries = await prisma.curriculumMatrixEntry.findMany({
    where: { matrixId: source.id },
    select: {
      date: true,
      weekOfYear: true,
      dayOfWeek: true,
      bimester: true,
      campoDeExperiencia: true,
      objetivoBNCC: true,
      objetivoBNCCCode: true,
      objetivoCurriculo: true,
      intencionalidade: true,
      // exemploAtividade: omitido intencionalmente
    },
    orderBy: [{ date: 'asc' }, { campoDeExperiencia: 'asc' }],
  });

  console.log(`📚 Entries na EI01: ${sourceEntries.length}\n`);

  if (sourceEntries.length === 0) {
    console.warn('⚠️  EI01 não tem entries. Nada a clonar.');
    console.warn('   Execute: node /app/scripts/seed-curriculum-ei01.js');
    process.exit(0);
  }

  // ── 5. Para cada segmento faltante: criar + clonar ─────────────────────────
  let totalMatricesCriadas = 0;
  let totalEntriesCriadas = 0;

  for (const segment of SEGMENTS) {
    if (segment === 'EI01') continue;

    let targetMatrix = existingMatrices.find(m => m.segment === segment);

    if (!targetMatrix) {
      // Criar a matriz para este segmento
      const baseName = source.name
        .replace(/EI0[123]/g, '')
        .replace(/Ber[çc][aá]rio|Maternal|Pr[eé]-Escola/gi, '')
        .replace(/\s*[-—]\s*$/, '')
        .trim();

      const newMatrix = await prisma.curriculumMatrix.create({
        data: {
          mantenedoraId,
          name: `${baseName || 'Matriz Curricular 2026'} — ${SEGMENT_LABELS[segment]}`,
          year: YEAR,
          segment,
          isActive: true,
          version: source.version || 1,
          description: source.description || `Matriz Curricular 2026 — ${segment}`,
        },
      });
      targetMatrix = { id: newMatrix.id, name: newMatrix.name, segment, isActive: true };
      totalMatricesCriadas++;
      console.log(`✅ Matriz criada: "${newMatrix.name}" (${newMatrix.id})`);
    } else {
      console.log(`ℹ️  Matriz ${segment} já existe: "${targetMatrix.name}" (${targetMatrix.id})`);
      if (!targetMatrix.isActive) {
        await prisma.curriculumMatrix.update({ where: { id: targetMatrix.id }, data: { isActive: true } });
        console.log(`   ↳ Ativada (estava inativa)`);
      }
    }

    // ── 6. Clonar entries (idempotente) ────────────────────────────────────
    const existingEntries = await prisma.curriculumMatrixEntry.findMany({
      where: { matrixId: targetMatrix.id },
      select: { date: true, campoDeExperiencia: true },
    });

    const existingKeys = new Set(
      existingEntries.map(e => {
        const d = e.date instanceof Date ? e.date : new Date(e.date);
        return `${d.toISOString().slice(0, 10)}_${e.campoDeExperiencia}`;
      })
    );

    const toInsert = sourceEntries.filter(e => {
      const d = e.date instanceof Date ? e.date : new Date(e.date);
      const key = `${d.toISOString().slice(0, 10)}_${e.campoDeExperiencia}`;
      return !existingKeys.has(key);
    });

    if (toInsert.length === 0) {
      console.log(`   ↳ Todas as ${sourceEntries.length} entries já existem em ${segment}. Nada a inserir.\n`);
      continue;
    }

    // createMany em batch (skipDuplicates como segurança extra)
    const result = await prisma.curriculumMatrixEntry.createMany({
      data: toInsert.map(e => ({
        matrixId: targetMatrix.id,
        date: e.date,
        weekOfYear: e.weekOfYear,
        dayOfWeek: e.dayOfWeek,
        bimester: e.bimester,
        campoDeExperiencia: e.campoDeExperiencia,
        objetivoBNCC: e.objetivoBNCC,
        objetivoBNCCCode: e.objetivoBNCCCode,
        objetivoCurriculo: e.objetivoCurriculo,
        intencionalidade: e.intencionalidade,
      })),
      skipDuplicates: true,
    });

    totalEntriesCriadas += result.count;
    console.log(`   ↳ ${result.count} entries clonadas para ${segment} (${existingEntries.length} já existiam)\n`);
  }

  // ── 7. Verificação final ───────────────────────────────────────────────────
  console.log('📊 Verificação final:');
  const finalMatrices = await prisma.curriculumMatrix.findMany({
    where: { mantenedoraId, year: YEAR, isActive: true },
    select: { segment: true, name: true, _count: { select: { entries: true } } },
    orderBy: { segment: 'asc' },
  });

  finalMatrices.forEach(m =>
    console.log(`   ${m.segment}: "${m.name}" — ${m._count.entries} entries`)
  );

  console.log(`\n✅ Concluído!`);
  console.log(`   Matrizes criadas: ${totalMatricesCriadas}`);
  console.log(`   Entries clonadas: ${totalEntriesCriadas}`);

  const allPresent = SEGMENTS.every(s => finalMatrices.some(m => m.segment === s));
  if (!allPresent) {
    const missing = SEGMENTS.filter(s => !finalMatrices.some(m => m.segment === s));
    console.warn(`\n⚠️  Segmentos ainda faltando: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log('\n🎉 EI01, EI02 e EI03 estão ativas e com entries!');
}

main()
  .catch(e => {
    console.error('❌ Erro:', e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
