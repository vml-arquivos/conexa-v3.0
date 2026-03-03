/**
 * ensure-matriz-2026-segments.ts
 *
 * Garante que para cada mantenedora existam matrizes ativas EI01, EI02, EI03
 * para o ano 2026, com entries preenchidas.
 *
 * Estratégia:
 *   - Se EI01 existe e EI02/EI03 não existem → cria as matrizes faltantes
 *   - Clona todas as entries de EI01 para os segmentos faltantes
 *   - Idempotente: não duplica entries já existentes (verifica por matrixId + date + campoDeExperiencia)
 *   - Usa createMany em batch para performance
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register src/scripts/ensure-matriz-2026-segments.ts
 *   MANTENEDORA_ID=<id> npx ts-node ... (para especificar mantenedora)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const YEAR = 2026;
const SEGMENTS = ['EI01', 'EI02', 'EI03'] as const;
type Segment = (typeof SEGMENTS)[number];

async function main() {
  console.log('🔍 ensure-matriz-2026-segments — iniciando...\n');

  // ── 1. Encontrar a mantenedora ──────────────────────────────────────────────
  let mantenedoraId = process.env.MANTENEDORA_ID;
  if (!mantenedoraId) {
    const mantenedora = await prisma.mantenedora.findFirst({
      where: { name: { contains: 'Conexa', mode: 'insensitive' } },
    });
    if (!mantenedora) {
      // Fallback: pega a primeira mantenedora ativa
      const first = await prisma.mantenedora.findFirst({ where: { isActive: true } });
      if (!first) {
        console.error('❌ Nenhuma mantenedora encontrada. Abortando.');
        process.exit(1);
      }
      console.warn(`⚠️  Mantenedora "Conexa" não encontrada. Usando: ${first.name} (${first.id})`);
      mantenedoraId = first.id;
    } else {
      mantenedoraId = mantenedora.id;
      console.log(`✅ Mantenedora: ${mantenedora.name} (${mantenedoraId})\n`);
    }
  } else {
    console.log(`✅ Usando MANTENEDORA_ID do ambiente: ${mantenedoraId}\n`);
  }

  // ── 2. Verificar matrizes existentes para 2026 ─────────────────────────────
  const existingMatrices = await prisma.curriculumMatrix.findMany({
    where: { mantenedoraId, year: YEAR },
    select: { id: true, name: true, segment: true, isActive: true, description: true, version: true },
  });

  console.log(`📊 Matrizes 2026 encontradas: ${existingMatrices.length}`);
  existingMatrices.forEach(m =>
    console.log(`   - ${m.segment}: ${m.name} (ativa: ${m.isActive})`),
  );
  console.log('');

  const existingSegments = new Set(existingMatrices.map(m => m.segment));

  // ── 3. Encontrar a matriz EI01 como fonte ──────────────────────────────────
  const sourceMatrix = existingMatrices.find(m => m.segment === 'EI01' && m.isActive);
  if (!sourceMatrix) {
    console.error('❌ Nenhuma matriz EI01 ativa encontrada para 2026. Execute seed-matriz-2026.ts primeiro.');
    process.exit(1);
  }
  console.log(`✅ Matriz fonte (EI01): ${sourceMatrix.name} (${sourceMatrix.id})\n`);

  // ── 4. Buscar todas as entries da EI01 ────────────────────────────────────
  const sourceEntries = await prisma.curriculumMatrixEntry.findMany({
    where: { matrixId: sourceMatrix.id },
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
    process.exit(0);
  }

  // ── 5. Para cada segmento faltante: criar matriz + clonar entries ──────────
  let totalMatricesCriadas = 0;
  let totalEntriesCriadas = 0;

  for (const segment of SEGMENTS) {
    if (segment === 'EI01') continue; // fonte, não precisa criar

    let targetMatrix = existingMatrices.find(m => m.segment === segment);

    if (!targetMatrix) {
      // Criar a matriz para este segmento
      const segmentLabel = segment === 'EI02' ? 'Maternal (EI02)' : 'Pré-Escola (EI03)';
      const newMatrix = await prisma.curriculumMatrix.create({
        data: {
          mantenedoraId,
          name: `${sourceMatrix.name.replace(/EI0[123]|Berçário|Maternal|Pré-Escola/gi, '').trim()} — ${segmentLabel}`,
          year: YEAR,
          segment,
          isActive: true,
          version: sourceMatrix.version,
          description: sourceMatrix.description,
        },
      });
      targetMatrix = {
        id: newMatrix.id,
        name: newMatrix.name,
        segment: newMatrix.segment,
        isActive: newMatrix.isActive,
        description: newMatrix.description,
        version: newMatrix.version,
      };
      totalMatricesCriadas++;
      console.log(`✅ Matriz criada: ${newMatrix.name} (${newMatrix.id})`);
    } else {
      console.log(`ℹ️  Matriz ${segment} já existe: ${targetMatrix.name} (${targetMatrix.id})`);
      // Garantir que está ativa
      if (!targetMatrix.isActive) {
        await prisma.curriculumMatrix.update({
          where: { id: targetMatrix.id },
          data: { isActive: true },
        });
        console.log(`   ↳ Ativada (estava inativa)`);
      }
    }

    // ── 6. Clonar entries (idempotente via skipDuplicates) ───────────────────
    // Buscar entries já existentes na matriz destino para evitar duplicatas
    const existingDates = await prisma.curriculumMatrixEntry.findMany({
      where: { matrixId: targetMatrix.id },
      select: { date: true, campoDeExperiencia: true },
    });

    const existingKeys = new Set(
      existingDates.map(e => `${e.date.toISOString().slice(0, 10)}_${e.campoDeExperiencia}`),
    );

    const toInsert = sourceEntries.filter(e => {
      const key = `${e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date).slice(0, 10)}_${e.campoDeExperiencia}`;
      return !existingKeys.has(key);
    });

    if (toInsert.length === 0) {
      console.log(`   ↳ Todas as ${sourceEntries.length} entries já existem em ${segment}. Nada a inserir.`);
      continue;
    }

    // createMany em batch
    const result = await prisma.curriculumMatrixEntry.createMany({
      data: toInsert.map(e => ({
        matrixId: targetMatrix!.id,
        date: e.date,
        weekOfYear: e.weekOfYear,
        dayOfWeek: e.dayOfWeek,
        bimester: e.bimester,
        campoDeExperiencia: e.campoDeExperiencia,
        objetivoBNCC: e.objetivoBNCC,
        objetivoBNCCCode: e.objetivoBNCCCode,
        objetivoCurriculo: e.objetivoCurriculo,
        intencionalidade: e.intencionalidade,
        // exemploAtividade: omitido intencionalmente
      })),
      skipDuplicates: true,
    });

    totalEntriesCriadas += result.count;
    console.log(`   ↳ ${result.count} entries clonadas para ${segment} (${existingDates.length} já existiam)`);
  }

  // ── 7. Verificação final ───────────────────────────────────────────────────
  console.log('\n📊 Verificação final:');
  const finalMatrices = await prisma.curriculumMatrix.findMany({
    where: { mantenedoraId, year: YEAR, isActive: true },
    select: {
      segment: true,
      name: true,
      _count: { select: { entries: true } },
    },
  });

  finalMatrices.forEach(m =>
    console.log(`   ${m.segment}: ${m.name} — ${m._count.entries} entries`),
  );

  console.log(`\n✅ Concluído!`);
  console.log(`   Matrizes criadas: ${totalMatricesCriadas}`);
  console.log(`   Entries clonadas: ${totalEntriesCriadas}`);

  const allSegmentsPresent = SEGMENTS.every(s =>
    finalMatrices.some(m => m.segment === s),
  );
  if (!allSegmentsPresent) {
    console.warn('\n⚠️  Nem todos os segmentos estão presentes. Verifique os logs acima.');
    process.exit(1);
  }
  console.log('\n🎉 EI01, EI02 e EI03 estão ativas e com entries!');
}

main()
  .catch(e => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
