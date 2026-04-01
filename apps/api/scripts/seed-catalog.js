/**
 * seed-catalog.js
 * Faz upsert dos CSVs de catálogo (pedagogico, higiene_pessoal, administrativo)
 * no modelo Material (por mantenedora, com isolamento multi-tenant).
 *
 * Uso: node scripts/seed-catalog.js [--mantenedora-id <id>]
 * ou via pnpm seed:catalog (configurado no package.json)
 *
 * Chave de upsert: mantenedoraId + code (constraint @@unique([mantenedoraId, code]))
 * Regra: não-destrutivo — apenas insere ou atualiza itens existentes.
 *
 * Normalização de categorias:
 *   HIGIENE_PESSOAL → HIGIENE (enum do backend)
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
    // Suporte a campos com vírgula entre aspas
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim().replace(/^"|"$/g, '');
    });
    rows.push(row);
  }
  return rows;
}

// Normaliza categoria para os valores aceitos pelo backend
function normalizeCategory(cat, defaultCategory) {
  const raw = (cat || defaultCategory || '').toUpperCase().trim();
  const MAP = {
    'HIGIENE_PESSOAL': 'HIGIENE',
    'HIGIENE PESSOAL': 'HIGIENE',
    'HIGIENE': 'HIGIENE',
    'PEDAGOGICO': 'PEDAGOGICO',
    'PEDAGÓGICO': 'PEDAGOGICO',
    'ADMINISTRATIVO': 'ADMINISTRATIVO',
    'LIMPEZA': 'LIMPEZA',
    'ALIMENTACAO': 'ALIMENTACAO',
    'ALIMENTAÇÃO': 'ALIMENTACAO',
  };
  return MAP[raw] || defaultCategory || 'OUTRO';
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

  // Resolver mantenedoraId: via argumento CLI ou primeira mantenedora do banco
  let mantenedoraId = null;
  const idxArg = process.argv.indexOf('--mantenedora-id');
  if (idxArg !== -1 && process.argv[idxArg + 1]) {
    mantenedoraId = process.argv[idxArg + 1];
    console.log(`🏢 Usando mantenedoraId via argumento: ${mantenedoraId}`);
  } else {
    const mantenedoras = await prisma.mantenedora.findMany({ take: 10, orderBy: { createdAt: 'asc' } });
    if (mantenedoras.length === 0) {
      console.error('❌ Nenhuma mantenedora encontrada no banco. Crie uma mantenedora antes de rodar o seed.');
      process.exit(1);
    }
    if (mantenedoras.length === 1) {
      mantenedoraId = mantenedoras[0].id;
      console.log(`🏢 Mantenedora encontrada: ${mantenedoras[0].name} (${mantenedoraId})`);
    } else {
      console.log(`🏢 ${mantenedoras.length} mantenedoras encontradas. Processando todas:`);
      for (const m of mantenedoras) {
        console.log(`   - ${m.name} (${m.id})`);
      }
      let totalInserted = 0, totalUpdated = 0, totalSkipped = 0;
      const errors = [];
      for (const m of mantenedoras) {
        const r = await processMantenedora(m.id, m.name, errors);
        totalInserted += r.inserted;
        totalUpdated += r.updated;
        totalSkipped += r.skipped;
      }
      printSummary(totalInserted, totalUpdated, totalSkipped, errors);
      return;
    }
  }

  const mantenedora = await prisma.mantenedora.findUnique({ where: { id: mantenedoraId } });
  if (!mantenedora) {
    console.error(`❌ Mantenedora não encontrada: ${mantenedoraId}`);
    process.exit(1);
  }

  const errors = [];
  const r = await processMantenedora(mantenedoraId, mantenedora.name, errors);
  printSummary(r.inserted, r.updated, r.skipped, errors);
}

async function processMantenedora(mantenedoraId, mantenedoraNome, errors) {
  console.log(`\n📦 Processando mantenedora: ${mantenedoraNome} (${mantenedoraId})`);
  let inserted = 0, updated = 0, skipped = 0;

  for (const { file, defaultCategory } of CATALOG_FILES) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`   ⚠️  Arquivo não encontrado: ${filePath} — ignorando.`);
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(content);
    console.log(`   📄 ${file}: ${rows.length} linha(s)`);
    let ins = 0, upd = 0, skip = 0;

    for (const row of rows) {
      const code = getField(row, 'codigo', 'code', 'cod', 'c_digo');
      const name = getField(row, 'descricao', 'descri_ao', 'name', 'nome', 'produto', 'item');
      if (!code || !name) { skip++; continue; }

      const category = normalizeCategory(
        getField(row, 'categoria', 'category', 'tipo'),
        defaultCategory
      );
      const unit = getField(row, 'unidade_medida', 'unidade', 'unit', 'unid') || 'UN';
      const referencePrice = parsePrice(getField(row, 'preco_unit', 'preco', 'price', 'valor', 'pre_o_unit', 'preco_referencia'));
      const supplier = getField(row, 'fornecedor', 'supplier', 'marca', 'fonte') || null;
      const description = supplier ? JSON.stringify({ supplier }) : null;

      try {
        const existing = await prisma.material.findUnique({
          where: { mantenedoraId_code: { mantenedoraId, code } },
        });
        if (existing) {
          await prisma.material.update({
            where: { mantenedoraId_code: { mantenedoraId, code } },
            data: { name, category, unit, referencePrice, description, isActive: true },
          });
          upd++;
        } else {
          await prisma.material.create({
            data: { mantenedoraId, code, name, category, unit, referencePrice, description, isActive: true },
          });
          ins++;
        }
      } catch (e) {
        errors.push(`${file} code=${code}: ${e.message}`);
      }
    }
    console.log(`      ✓ inseridos: ${ins}  atualizados: ${upd}  ignorados: ${skip}`);
    inserted += ins; updated += upd; skipped += skip;
  }
  return { inserted, updated, skipped };
}

function printSummary(inserted, updated, skipped, errors) {
  console.log('\n📊 Resumo final:');
  console.log(`   Inseridos  : ${inserted}`);
  console.log(`   Atualizados: ${updated}`);
  console.log(`   Ignorados  : ${skipped}`);
  if (errors.length > 0) {
    console.error(`\n❌ ${errors.length} erro(s):`);
    errors.forEach(e => console.error(`   ${e}`));
    process.exit(1);
  } else {
    console.log('\n✅ Catálogo atualizado com sucesso!');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
