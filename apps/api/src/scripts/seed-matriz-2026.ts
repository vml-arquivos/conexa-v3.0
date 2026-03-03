/**
 * seed-matriz-2026.ts
 *
 * Cria (ou garante) as três matrizes EI01, EI02, EI03 para o ano 2026
 * e popula as entries a partir do dataset JSON.
 *
 * Idempotente: se a matriz/entry já existir, não duplica.
 */
import { PrismaClient, CampoDeExperiencia } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const SEGMENTS = ['EI01', 'EI02', 'EI03'] as const;
type Segment = (typeof SEGMENTS)[number];
const SEGMENT_LABELS: Record<Segment, string> = {
  EI01: 'Berçário (EI01)',
  EI02: 'Maternal (EI02)',
  EI03: 'Pré-Escola (EI03)',
};

interface MatrizEntry {
  date: string;
  weekOfYear: number;
  bimester: number;
  campoDeExperiencia: string;
  objetivoBNCC: string;
  objetivoBNCCCode: string;
  objetivoCurriculo: string;
  intencionalidade: string;
  exemploAtividade: string;
}

interface MatrizData {
  metadata: {
    title: string;
    organization: string;
    year: number;
    version: number;
    description: string;
  };
  entries: MatrizEntry[];
}

function findDatasetPath(filename: string): string {
  const paths = [
    path.resolve(__dirname, '../../data', filename),
    path.resolve(__dirname, '../data', filename),
    `/app/dist/data/${filename}`,
    `/app/data/${filename}`,
  ];

  console.log(`🔍 Searching for dataset: ${filename}`);
  for (const p of paths) {
    if (fs.existsSync(p)) {
      console.log(`🚀 Lendo dados de: ${p}`);
      return p;
    }
  }

  console.error(`❌ Dataset not found. Tried paths:`);
  paths.forEach((p) => console.error(`   - ${p}`));
  process.exit(1);
}

async function main() {
  console.log('🌱 Iniciando seed da Matriz Curricular 2026 (EI01/EI02/EI03)...\n');

  const dataPath = findDatasetPath('matriz-curricular-2026-sample.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const matrizData: MatrizData = JSON.parse(rawData);

  console.log(`📊 Metadata:`);
  console.log(`   Title: ${matrizData.metadata.title}`);
  console.log(`   Year: ${matrizData.metadata.year}`);
  console.log(`   Version: ${matrizData.metadata.version}`);
  console.log(`   Entries no dataset: ${matrizData.entries.length}\n`);

  // Buscar mantenedora Conexa (criada pelo seed:ensure-cocris-units)
  let mantenedora = await prisma.mantenedora.findFirst({
    where: { name: { contains: 'Conexa', mode: 'insensitive' } },
  });
  if (!mantenedora) {
    mantenedora = await prisma.mantenedora.findFirst({ where: { isActive: true } });
  }
  if (!mantenedora) {
    console.error('❌ Mantenedora não encontrada. Execute seed:ensure-cocris-units primeiro.');
    process.exit(1);
  }
  console.log(`✅ Mantenedora: ${mantenedora.name} (${mantenedora.id})\n`);

  let totalMatricesCriadas = 0;
  let totalEntriesCriadas = 0;
  let totalEntriesSkipped = 0;

  // Para cada segmento: garantir matriz + entries
  for (const segment of SEGMENTS) {
    console.log(`\n📂 Processando segmento ${segment}...`);

    let matriz = await prisma.curriculumMatrix.findFirst({
      where: { mantenedoraId: mantenedora.id, year: matrizData.metadata.year, segment },
    });

    if (!matriz) {
      const baseName = matrizData.metadata.title.replace(/EI0[123]|Berçário|Maternal|Pré-Escola/gi, '').trim();
      matriz = await prisma.curriculumMatrix.create({
        data: {
          mantenedoraId: mantenedora.id,
          name: `${baseName} — ${SEGMENT_LABELS[segment]}`,
          year: matrizData.metadata.year,
          segment,
          isActive: true,
          description: matrizData.metadata.description,
          version: matrizData.metadata.version,
        },
      });
      totalMatricesCriadas++;
      console.log(`   ✅ Matriz criada: ${matriz.name} (${matriz.id})`);
    } else {
      console.log(`   ℹ️  Matriz já existe: ${matriz.name} (${matriz.id})`);
      if (!matriz.isActive) {
        await prisma.curriculumMatrix.update({ where: { id: matriz.id }, data: { isActive: true } });
        console.log(`   ↳ Ativada (estava inativa)`);
      }
    }

    let created = 0;
    let skipped = 0;

    for (const entry of matrizData.entries) {
      const targetDate = new Date(entry.date + 'T12:00:00');

      const existing = await prisma.curriculumMatrixEntry.findFirst({
        where: {
          matrixId: matriz.id,
          date: { gte: new Date(entry.date + 'T00:00:00'), lte: new Date(entry.date + 'T23:59:59') },
          campoDeExperiencia: entry.campoDeExperiencia as CampoDeExperiencia,
        },
      });

      if (existing) { skipped++; continue; }

      await prisma.curriculumMatrixEntry.create({
        data: {
          matrixId: matriz.id,
          date: targetDate,
          weekOfYear: entry.weekOfYear,
          dayOfWeek: targetDate.getDay(),
          bimester: entry.bimester,
          campoDeExperiencia: entry.campoDeExperiencia as CampoDeExperiencia,
          objetivoBNCC: entry.objetivoBNCC,
          objetivoBNCCCode: entry.objetivoBNCCCode,
          objetivoCurriculo: entry.objetivoCurriculo,
          intencionalidade: entry.intencionalidade,
          exemploAtividade: entry.exemploAtividade,
        },
      });
      created++;
    }

    totalEntriesCriadas += created;
    totalEntriesSkipped += skipped;
    console.log(`   📚 Entries criadas: ${created} | já existiam: ${skipped}`);
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Matrizes criadas: ${totalMatricesCriadas}`);
  console.log(`   ✅ Entries criadas: ${totalEntriesCriadas}`);
  console.log(`   ⏭️  Entries já existentes: ${totalEntriesSkipped}`);
  console.log(`\n✅ Seed da Matriz Curricular 2026 (EI01/EI02/EI03) concluído com sucesso!`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
