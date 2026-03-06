/**
 * seed-catalog.js
 * Faz upsert dos 3 CSVs de catálogo (pedagogico, higiene_pessoal, administrativo)
 * no modelo Material (global, sem unitId).
 *
 * Uso: node scripts/seed-catalog.js
 * ou via pnpm seed:catalog (configurado no package.json)
 *
 * Chave de upsert: code (único no modelo Material)
 * Regra: não-destrutivo — apenas insere ou atualiza itens existentes.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ── Parser CSV simples (sem dependências externas) ────────────────────────────
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase()
    .replace(/[áàâã]/g, 'a').replace(/[éèê]/g, 'e').replace(/[íìî]/g, 'i')
    .replace(/[óòôõ]/g, 'o').replace(/[úùû]/g, 'u').replace(/ç/g, 'c')
    .replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim().replace(/^"|"$/g, '');
    });
    rows.push(row);
  }
  return rows;
}

// Normaliza header para campo esperado
function getField(row, ...aliases) {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== '') return row[alias];
  }
  return '';
}

function parsePrice(v) {
  if (!v) return 0.0;
  const s = String(v).replace(/[R$\s]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0.0 : Math.round(n * 100) / 100;
}

// ── Arquivos de catálogo ──────────────────────────────────────────────────────
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const CATALOG_FILES = [
  { file: 'catalogo_pedagogico.csv',     defaultCategory: 'PEDAGOGICO' },
  { file: 'catalogo_higiene_pessoal.csv', defaultCategory: 'HIGIENE' },
  { file: 'catalogo_administrativo.csv',  defaultCategory: 'ADMINISTRATIVO' },
];

async function main() {
  console.log('🌱 seed:catalog — iniciando upsert do catálogo de materiais\n');

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  const errors = [];

  for (const { file, defaultCategory } of CATALOG_FILES) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Arquivo não encontrado: ${filePath} — ignorando.`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(content);
    console.log(`📄 ${file}: ${rows.length} linha(s)`);

    let inserted = 0, updated = 0, skipped = 0;

    for (const row of rows) {
      const code = getField(row, 'codigo', 'code', 'cod', 'c_digo');
      const name = getField(row, 'descricao', 'descri_ao', 'name', 'nome', 'produto', 'item');
      if (!code || !name) { skipped++; continue; }

      const category = getField(row, 'categoria', 'category', 'tipo') || defaultCategory;
      const unit = getField(row, 'unidade_medida', 'unidade', 'unit', 'unid') || 'UN';
      const referencePrice = parsePrice(getField(row, 'preco_unit', 'preco', 'price', 'valor', 'pre_o_unit'));
      const supplier = getField(row, 'fornecedor', 'supplier', 'marca') || null;
      // Armazena fornecedor no campo description como JSON
      const description = supplier ? JSON.stringify({ supplier }) : null;

      try {
        const existing = await prisma.material.findUnique({ where: { code } });
        if (existing) {
          await prisma.material.update({
            where: { code },
            data: { name, category, unit, referencePrice, description, isActive: true },
          });
          updated++;
        } else {
          await prisma.material.create({
            data: { code, name, category, unit, referencePrice, description, isActive: true },
          });
          inserted++;
        }
      } catch (e) {
        errors.push(`${file} code=${code}: ${e.message}`);
      }
    }

    console.log(`   ✓ inseridos: ${inserted}  atualizados: ${updated}  ignorados: ${skipped}`);
    totalInserted += inserted;
    totalUpdated += updated;
    totalSkipped += skipped;
  }

  console.log('\n📊 Resumo final:');
  console.log(`   Inseridos : ${totalInserted}`);
  console.log(`   Atualizados: ${totalUpdated}`);
  console.log(`   Ignorados : ${totalSkipped}`);
  if (errors.length > 0) {
    console.error(`\n❌ ${errors.length} erro(s):`);
    errors.forEach(e => console.error(`   ${e}`));
  } else {
    console.log('\n✅ Catálogo atualizado com sucesso!');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
