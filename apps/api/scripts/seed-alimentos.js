/**
 * seed-alimentos.js
 * Popula a tabela `alimento` com o catálogo nutricional completo
 * a partir de apps/api/data/catalogo_alimentos.csv
 *
 * Uso:
 *   node scripts/seed-alimentos.js
 *   node scripts/seed-alimentos.js --reset   (apaga e reinsere tudo)
 *
 * Estratégia: upsert por nome (campo único).
 * Não-destrutivo por padrão — apenas insere ou atualiza.
 *
 * Fonte dos dados: Tabela TACO (UNICAMP/IBGE) + IBGE POF 2017-2018
 * Valores por 100g do alimento cru/preparado conforme indicado.
 */
'use strict';

const path = require('path');
const fs   = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current  = '';
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

function toDecimal(val, fallback = 0) {
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? fallback : n;
}

// Categorias válidas do enum Prisma
const VALID_CATEGORIES = new Set([
  'CEREAIS_GRAOS', 'LEGUMINOSAS', 'PROTEINAS', 'LATICINIOS',
  'FRUTAS', 'VERDURAS_LEGUMES', 'GORDURAS_OLEOS', 'ACUCARES_DOCES',
  'BEBIDAS', 'PREPARACOES', 'OLEAGINOSAS', 'EMBUTIDOS',
  'FARINHAS_AMIDOS', 'TEMPEROS_CONDIMENTOS', 'SOPAS_CALDOS', 'OUTROS',
]);

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args  = process.argv.slice(2);
  const reset = args.includes('--reset');

  const csvPath = path.join(__dirname, '..', 'data', 'catalogo_alimentos.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV não encontrado: ${csvPath}`);
    process.exit(1);
  }

  const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));
  console.log(`📋 ${rows.length} alimentos encontrados no CSV.`);

  if (reset) {
    const deleted = await prisma.alimento.deleteMany({});
    console.log(`🗑️  Reset: ${deleted.count} registros removidos.`);
  }

  let inserted = 0;
  let updated  = 0;
  let skipped  = 0;
  const errors = [];

  for (const row of rows) {
    const nome = row['nome']?.trim();
    if (!nome) { skipped++; continue; }

    const categoria = row['categoria']?.trim().toUpperCase();
    if (!VALID_CATEGORIES.has(categoria)) {
      errors.push(`Categoria inválida para "${nome}": "${categoria}"`);
      skipped++;
      continue;
    }

    const data = {
      nome,
      categoria,
      unidadePadrao:    row['unidade_padrao']?.trim()  || 'g',
      porcaoPadrao:     toDecimal(row['porcao_padrao_g'], 100),
      descricao:        row['descricao']?.trim()        || null,
      calorias100g:     toDecimal(row['calorias_100g']),
      proteinas100g:    toDecimal(row['proteinas_100g']),
      carboidratos100g: toDecimal(row['carboidratos_100g']),
      gorduras100g:     toDecimal(row['gorduras_100g']),
      fibras100g:       toDecimal(row['fibras_100g']),
      sodio100g:        toDecimal(row['sodio_100g']),
      ativo:            true,
    };

    try {
      const existing = await prisma.alimento.findUnique({ where: { nome } });
      if (existing) {
        await prisma.alimento.update({ where: { nome }, data });
        updated++;
      } else {
        await prisma.alimento.create({ data });
        inserted++;
      }
    } catch (err) {
      errors.push(`Erro em "${nome}": ${err.message}`);
      skipped++;
    }
  }

  console.log('\n✅ Seed de alimentos concluído:');
  console.log(`   Inseridos : ${inserted}`);
  console.log(`   Atualizados: ${updated}`);
  console.log(`   Ignorados  : ${skipped}`);

  if (errors.length > 0) {
    console.warn('\n⚠️  Erros encontrados:');
    errors.forEach(e => console.warn(`   - ${e}`));
  }

  const total = await prisma.alimento.count();
  console.log(`\n📊 Total no banco: ${total} alimentos`);
}

main()
  .catch(err => { console.error('❌ Erro fatal:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
