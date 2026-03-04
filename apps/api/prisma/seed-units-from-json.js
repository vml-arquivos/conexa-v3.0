#!/usr/bin/env node
/**
 * seed-units-from-json.js
 *
 * Script idempotente que lê prisma/units.json e faz upsert de cada unidade.
 * Executável diretamente com: node prisma/seed-units-from-json.js
 *
 * Estratégias de descoberta da Mantenedora (em ordem):
 *   1. MANTENEDORA_ID env var
 *   2. Busca por nome contendo "COCRIS" (case-insensitive)
 *   3. Primeira mantenedora do banco
 *   4. Erro — não continua sem mantenedora
 *
 * Uso:
 *   node prisma/seed-units-from-json.js
 *   MANTENEDORA_ID=<id> node prisma/seed-units-from-json.js
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  // ── 1. Carregar units.json ──────────────────────────────────────────────
  const jsonPath = path.join(__dirname, 'units.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ Arquivo não encontrado: ' + jsonPath);
    process.exit(1);
  }

  let units;
  try {
    units = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  } catch (e) {
    console.error('❌ Erro ao ler units.json:', e.message);
    process.exit(1);
  }

  if (!Array.isArray(units) || units.length === 0) {
    console.error('❌ units.json está vazio ou não é um array.');
    process.exit(1);
  }

  console.log('📋 ' + units.length + ' unidade(s) encontrada(s) em units.json');

  // ── 2. Descobrir mantenedoraId ──────────────────────────────────────────
  let mantenedoraId = process.env.MANTENEDORA_ID;

  if (!mantenedoraId) {
    // Tenta por nome COCRIS primeiro
    const cocris = await prisma.mantenedora.findFirst({
      where: { name: { contains: 'COCRIS', mode: 'insensitive' } },
      select: { id: true, name: true },
    }).catch(() => null);

    if (cocris) {
      mantenedoraId = cocris.id;
      console.log('🏢 Mantenedora COCRIS encontrada: ' + cocris.name + ' (' + mantenedoraId + ')');
    } else {
      // Fallback: primeira mantenedora do banco
      const primeira = await prisma.mantenedora.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true },
      }).catch(() => null);

      if (!primeira) {
        console.error('❌ Nenhuma Mantenedora encontrada no banco.');
        console.error('   Crie uma Mantenedora antes de rodar este seed,');
        console.error('   ou defina MANTENEDORA_ID=<id> como variável de ambiente.');
        process.exit(1);
      }

      mantenedoraId = primeira.id;
      console.log('🏢 Mantenedora detectada (fallback): ' + primeira.name + ' (' + mantenedoraId + ')');
    }
  } else {
    // Valida que o ID existe
    const existe = await prisma.mantenedora.findUnique({
      where: { id: mantenedoraId },
      select: { id: true, name: true },
    }).catch(() => null);

    if (!existe) {
      console.error('❌ MANTENEDORA_ID "' + mantenedoraId + '" não encontrado no banco.');
      process.exit(1);
    }
    console.log('🏢 Usando MANTENEDORA_ID do env: ' + existe.name + ' (' + mantenedoraId + ')');
  }

  // ── 3. Upsert de cada unidade ───────────────────────────────────────────
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const unit of units) {
    if (!unit.code || !unit.name) {
      console.warn('⚠️  Ignorando entrada sem code ou name: ' + JSON.stringify(unit));
      skipped++;
      continue;
    }

    try {
      const existing = await prisma.unit.findFirst({
        where: { mantenedoraId, code: unit.code },
        select: { id: true },
      });

      if (existing) {
        // Atualiza apenas campos de texto — não altera isActive para preservar edições manuais
        await prisma.unit.update({
          where: { id: existing.id },
          data: {
            name: unit.name,
            ...(unit.city !== undefined && { city: unit.city }),
            ...(unit.state !== undefined && { state: unit.state }),
            ...(unit.address !== undefined && { address: unit.address }),
            ...(unit.phone !== undefined && { phone: unit.phone }),
            ...(unit.email !== undefined && { email: unit.email }),
          },
        });
        console.log('  ↻ Atualizada: ' + unit.code + ' — ' + unit.name);
        updated++;
      } else {
        await prisma.unit.create({
          data: {
            mantenedoraId,
            code: unit.code,
            name: unit.name,
            city: unit.city || null,
            state: unit.state || null,
            address: unit.address || null,
            phone: unit.phone || null,
            email: unit.email || null,
            isActive: unit.isActive !== undefined ? unit.isActive : true,
          },
        });
        console.log('  ✚ Criada:     ' + unit.code + ' — ' + unit.name);
        created++;
      }
    } catch (err) {
      console.error('  ❌ Erro ao processar ' + unit.code + ': ' + err.message);
      skipped++;
    }
  }

  console.log('\n✅ Seed concluído:');
  console.log('   ' + created + ' unidade(s) criada(s)');
  console.log('   ' + updated + ' unidade(s) atualizada(s)');
  if (skipped > 0) console.log('   ' + skipped + ' entrada(s) ignorada(s)');
}

main()
  .catch(err => {
    console.error('❌ Erro fatal no seed:', err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
