/**
 * ensure-matriz-segments.js  (v2 — corrigido)
 *
 * PROBLEMA CORRIGIDO: A versão anterior clonava entries da EI01 para EI02/EI03,
 * resultando em bebês, crianças bem pequenas e crianças pequenas com os mesmos
 * objetivos. Isso viola a BNCC e o Currículo em Movimento do DF.
 *
 * SOLUÇÃO: Cada segmento (EI01, EI02, EI03) deve ter sua própria matriz com
 * objetivos de aprendizagem específicos para a faixa etária.
 *
 * Faixas etárias conforme BNCC e Currículo em Movimento do DF:
 *   EI01 – Bebês:                 0 a 18 meses   (Berçário I e II)
 *   EI02 – Crianças Bem Pequenas: 19 a 47 meses  (Maternal I e II)
 *   EI03 – Crianças Pequenas:     48 a 71 meses  (I Período / Primeiro Período)
 *
 * Uso:
 *   node /app/scripts/ensure-matriz-segments.js
 *   MANTENEDORA_ID=<id> node /app/scripts/ensure-matriz-segments.js
 *   DRY_RUN=true node /app/scripts/ensure-matriz-segments.js
 */
'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const YEAR = 2026;
const DRY_RUN = process.env.DRY_RUN === 'true';

const SEGMENT_META = {
  EI01: {
    label: 'Bebês — 0 a 18 meses (Berçário I e II)',
    descricao: 'Matriz Curricular 2026 — EI01 Bebês (0 a 18 meses)',
    faixaEtaria: '0–18 meses',
    turmas: ['Berçário I', 'Berçário II'],
  },
  EI02: {
    label: 'Crianças Bem Pequenas — 19 a 47 meses (Maternal I e II)',
    descricao: 'Matriz Curricular 2026 — EI02 Crianças Bem Pequenas (19 a 47 meses)',
    faixaEtaria: '19–47 meses',
    turmas: ['Maternal I', 'Maternal II'],
  },
  EI03: {
    label: 'Crianças Pequenas — 48 a 71 meses (I Período / Primeiro Período)',
    descricao: 'Matriz Curricular 2026 — EI03 Crianças Pequenas (48 a 71 meses)',
    faixaEtaria: '48–71 meses',
    turmas: ['I Período', 'Primeiro Período'],
  },
};

async function main() {
  const tag = DRY_RUN ? '[DRY-RUN] ' : '';
  console.log(`${tag}ensure-matriz-segments.js v2 — iniciando...\n`);

  // ── 1. Encontrar a mantenedora ─────────────────────────────────────────────
  let mantenedoraId = process.env.MANTENEDORA_ID;
  if (!mantenedoraId) {
    const mantenedora =
      (await prisma.mantenedora.findFirst({
        where: { name: { contains: 'Coração', mode: 'insensitive' } },
      })) ||
      (await prisma.mantenedora.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      }));
    if (!mantenedora) {
      console.error('❌ Nenhuma mantenedora encontrada. Abortando.');
      process.exit(1);
    }
    mantenedoraId = mantenedora.id;
    console.log(`✅ Mantenedora: ${mantenedora.name} (${mantenedoraId})\n`);
  }

  // ── 2. Verificar matrizes existentes ───────────────────────────────────────
  const existingMatrices = await prisma.curriculumMatrix.findMany({
    where: { mantenedoraId, year: YEAR },
    select: {
      id: true, name: true, segment: true, isActive: true, version: true,
      _count: { select: { entries: true } },
    },
  });

  console.log(`📊 Matrizes 2026 encontradas: ${existingMatrices.length}`);
  existingMatrices.forEach(m =>
    console.log(
      `   ${m.segment}: "${m.name}" (ativa: ${m.isActive}, entries: ${m._count.entries})`
    )
  );
  console.log('');

  // ── 3. Diagnóstico: detectar clonagem indevida ─────────────────────────────
  const bySegment = {};
  for (const m of existingMatrices) {
    if (!bySegment[m.segment]) bySegment[m.segment] = [];
    bySegment[m.segment].push(m);
  }

  // Verificar se EI02 e EI03 têm os mesmos objetivoBNCCCode que EI01 (clonagem)
  const ei01 = (bySegment['EI01'] || []).find(m => m.isActive);
  const ei02 = (bySegment['EI02'] || []).find(m => m.isActive);
  const ei03 = (bySegment['EI03'] || []).find(m => m.isActive);

  if (ei01 && ei02) {
    const sample01 = await prisma.curriculumMatrixEntry.findFirst({
      where: { matrixId: ei01.id },
      select: { objetivoBNCCCode: true },
    });
    const sample02 = await prisma.curriculumMatrixEntry.findFirst({
      where: { matrixId: ei02.id },
      select: { objetivoBNCCCode: true },
    });
    if (sample01 && sample02 && sample01.objetivoBNCCCode?.startsWith('EI01') &&
        sample02.objetivoBNCCCode?.startsWith('EI01')) {
      console.warn('⚠️  ATENÇÃO: EI02 contém objetivos EI01 (clonagem indevida detectada).');
      console.warn('   A EI02 deve conter objetivos EI02xx (ex: EI02EO01, EI02CG01, etc.)');
      console.warn('   Execute o script seed-curriculum-ei02.js para corrigir os dados.\n');
    }
  }

  if (ei01 && ei03) {
    const sample01 = await prisma.curriculumMatrixEntry.findFirst({
      where: { matrixId: ei01.id },
      select: { objetivoBNCCCode: true },
    });
    const sample03 = await prisma.curriculumMatrixEntry.findFirst({
      where: { matrixId: ei03.id },
      select: { objetivoBNCCCode: true },
    });
    if (sample01 && sample03 && sample01.objetivoBNCCCode?.startsWith('EI01') &&
        sample03.objetivoBNCCCode?.startsWith('EI01')) {
      console.warn('⚠️  ATENÇÃO: EI03 contém objetivos EI01 (clonagem indevida detectada).');
      console.warn('   A EI03 deve conter objetivos EI03xx (ex: EI03EO01, EI03CG01, etc.)');
      console.warn('   Execute o script seed-curriculum-ei03.js para corrigir os dados.\n');
    }
  }

  // ── 4. Garantir que cada segmento tem uma matriz ativa ─────────────────────
  for (const [segment, meta] of Object.entries(SEGMENT_META)) {
    const existing = (bySegment[segment] || []).find(m => m.isActive);

    if (!existing) {
      const inactiveExisting = (bySegment[segment] || [])[0];
      if (inactiveExisting) {
        console.log(`⚠️  ${segment} existe mas está inativa — ativando...`);
        if (!DRY_RUN) {
          await prisma.curriculumMatrix.update({
            where: { id: inactiveExisting.id },
            data: { isActive: true },
          });
        }
        console.log(`   ↳ ${DRY_RUN ? '[DRY-RUN] ' : ''}Ativada: "${inactiveExisting.name}"`);
      } else {
        console.log(`➕ Criando matriz ${segment}: "${meta.label}"`);
        if (!DRY_RUN) {
          await prisma.curriculumMatrix.create({
            data: {
              mantenedoraId,
              name: `Matriz Curricular COCRIS 2026 — ${meta.label}`,
              year: YEAR,
              segment,
              isActive: true,
              version: 1,
              description: meta.descricao,
            },
          });
        }
        console.log(
          `   ↳ ${DRY_RUN ? '[DRY-RUN] ' : ''}Criada. ` +
          `IMPORTANTE: execute seed-curriculum-${segment.toLowerCase()}.js para popular os objetivos corretos.`
        );
      }
    } else {
      console.log(`✅ ${segment}: "${existing.name}" (${existing._count.entries} entries)`);
      // Atualizar description se desatualizada
      const expectedDesc = meta.descricao;
      if (existing.description !== expectedDesc && !DRY_RUN) {
        // Apenas atualizar metadados, nunca os entries
        // (não fazemos nada, para não sobrescrever dados pedagógicos)
      }
    }
  }

  // ── 5. Verificação de faixas etárias das turmas ───────────────────────────
  console.log('\n📋 Verificando turmas por faixa etária:');
  const classrooms = await prisma.classroom.findMany({
    where: { isActive: true },
    select: { id: true, name: true, ageGroupMin: true, ageGroupMax: true },
    orderBy: [{ ageGroupMin: 'asc' }, { name: 'asc' }],
  });

  const problemas = [];
  for (const c of classrooms) {
    const nameUpper = c.name.toUpperCase();
    let expectedSegment = null;

    // Inferir segmento esperado pelo NOME da turma
    if (nameUpper.includes('BERÇ') && nameUpper.includes('II')) {
      expectedSegment = 'EI01'; // Berçário II: ainda bebês (12–18 meses)
    } else if (nameUpper.includes('BERÇ') && nameUpper.includes('I')) {
      expectedSegment = 'EI01'; // Berçário I: bebês (0–12 meses)
    } else if (nameUpper.includes('MATERNAL') && (nameUpper.includes(' I ') || nameUpper.includes(' 1') || nameUpper.endsWith(' I'))) {
      expectedSegment = 'EI02'; // Maternal I: crianças bem pequenas
    } else if (nameUpper.includes('MATERNAL') && (nameUpper.includes(' II') || nameUpper.includes(' 2'))) {
      expectedSegment = 'EI02'; // Maternal II: crianças bem pequenas
    } else if (nameUpper.includes('PERÍODO') || nameUpper.includes('PERÍODO')) {
      expectedSegment = 'EI03'; // Qualquer período: crianças pequenas
    }

    // Segmento derivado do ageGroupMin atual
    let derivedSegment = null;
    if (c.ageGroupMin <= 18) derivedSegment = 'EI01';
    else if (c.ageGroupMin <= 47) derivedSegment = 'EI02';
    else if (c.ageGroupMin <= 71) derivedSegment = 'EI03';

    const ok = !expectedSegment || expectedSegment === derivedSegment;
    const icon = ok ? '✅' : '❌';
    console.log(
      `   ${icon} ${c.name.padEnd(30)} ageGroupMin=${String(c.ageGroupMin).padStart(2)}m ` +
      `→ ${derivedSegment || '???'}` +
      (ok ? '' : `  ← ESPERADO: ${expectedSegment}`)
    );
    if (!ok) problemas.push({ ...c, expectedSegment, derivedSegment });
  }

  if (problemas.length > 0) {
    console.log(`\n⚠️  ${problemas.length} turma(s) com faixa etária incorreta.`);
    console.log('   Execute fix-classroom-age-groups.sql para corrigir.\n');
  } else {
    console.log('\n✅ Todas as turmas estão com faixa etária correta.\n');
  }

  // ── 6. Resumo final ────────────────────────────────────────────────────────
  const finalMatrices = await prisma.curriculumMatrix.findMany({
    where: { mantenedoraId, year: YEAR, isActive: true },
    select: {
      segment: true, name: true,
      _count: { select: { entries: true } },
    },
    orderBy: { segment: 'asc' },
  });

  console.log('📊 Estado final das matrizes ativas:');
  for (const m of finalMatrices) {
    const meta = SEGMENT_META[m.segment];
    const faixa = meta ? meta.faixaEtaria : '?';
    const hasCorrectCodes = await prisma.curriculumMatrixEntry.findFirst({
      where: {
        matrixId: (finalMatrices.find(x => x.segment === m.segment) || {}).id,
        objetivoBNCCCode: { startsWith: m.segment },
      },
    }).catch(() => null);
    const correctIcon = hasCorrectCodes ? '✅' : '⚠️ ';
    console.log(
      `   ${correctIcon} ${m.segment} (${faixa}): "${m.name}" — ${m._count.entries} entries`
    );
  }

  const missingSegments = Object.keys(SEGMENT_META).filter(
    s => !finalMatrices.some(m => m.segment === s)
  );
  if (missingSegments.length > 0) {
    console.warn(`\n⚠️  Segmentos faltando: ${missingSegments.join(', ')}`);
    process.exit(1);
  }

  console.log('\n✅ Concluído!');
  if (DRY_RUN) console.log('   (modo DRY_RUN — nenhuma alteração foi gravada)');
}

main()
  .catch(e => {
    console.error('❌ Erro:', e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
