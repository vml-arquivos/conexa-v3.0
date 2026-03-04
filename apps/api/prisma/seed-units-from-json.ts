/**
 * seed-units-from-json.ts
 *
 * Script idempotente que lê prisma/units.json e faz upsert de cada unidade
 * usando (mantenedoraId, code) como chave única.
 *
 * Estratégias de descoberta da Mantenedora (em ordem):
 *   1. MANTENEDORA_ID env var
 *   2. Primeira mantenedora do banco
 *   3. Erro — não continua sem mantenedora
 *
 * Uso:
 *   npx ts-node prisma/seed-units-from-json.ts
 *   ou via npm script: pnpm seed:units:cocris
 */
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface UnitJson {
  code: string;
  name: string;
  city?: string;
  state?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

async function main() {
  // ── 1. Carregar units.json ──────────────────────────────────────────────
  const jsonPath = path.join(__dirname, 'units.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Arquivo não encontrado: ${jsonPath}`);
    process.exit(1);
  }
  const units: UnitJson[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`📋 ${units.length} unidade(s) encontrada(s) em units.json`);

  // ── 2. Descobrir mantenedoraId ──────────────────────────────────────────
  let mantenedoraId: string | undefined = process.env.MANTENEDORA_ID;

  if (!mantenedoraId) {
    const mantenedora = await prisma.mantenedora.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });
    if (!mantenedora) {
      console.error('❌ Nenhuma Mantenedora encontrada no banco. Crie uma antes de rodar este seed.');
      process.exit(1);
    }
    mantenedoraId = mantenedora.id;
    console.log(`🏢 Mantenedora detectada: ${mantenedora.name} (${mantenedoraId})`);
  } else {
    console.log(`🏢 Usando MANTENEDORA_ID do env: ${mantenedoraId}`);
  }

  // ── 3. Upsert de cada unidade ───────────────────────────────────────────
  let created = 0;
  let updated = 0;

  for (const unit of units) {
    if (!unit.code || !unit.name) {
      console.warn(`⚠️  Ignorando entrada sem code ou name: ${JSON.stringify(unit)}`);
      continue;
    }

    const existing = await prisma.unit.findFirst({
      where: { mantenedoraId, code: unit.code },
      select: { id: true },
    });

    if (existing) {
      await prisma.unit.update({
        where: { id: existing.id },
        data: {
          name: unit.name,
          city: unit.city ?? undefined,
          state: unit.state ?? undefined,
          address: unit.address ?? undefined,
          phone: unit.phone ?? undefined,
          email: unit.email ?? undefined,
          // isActive não é alterado em updates para preservar edições manuais
        },
      });
      console.log(`  ↻ Atualizada: ${unit.code} — ${unit.name}`);
      updated++;
    } else {
      await prisma.unit.create({
        data: {
          mantenedoraId,
          code: unit.code,
          name: unit.name,
          city: unit.city ?? undefined,
          state: unit.state ?? undefined,
          address: unit.address ?? undefined,
          phone: unit.phone ?? undefined,
          email: unit.email ?? undefined,
          isActive: unit.isActive ?? true,
        },
      });
      console.log(`  ✚ Criada:     ${unit.code} — ${unit.name}`);
      created++;
    }
  }

  console.log(`\n✅ Seed concluído: ${created} criada(s), ${updated} atualizada(s).`);
}

main()
  .catch(err => {
    console.error('❌ Erro no seed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
