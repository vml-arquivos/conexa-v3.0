#!/usr/bin/env node
/**
 * patch-matriz-2026-from-pdf.js
 *
 * Atualiza a matriz curricular 2026 ativa (EI01/EI02/EI03) a partir do PDF
 * da nova sequência pedagógica, de forma idempotente e sem criar duplicatas.
 *
 * Uso:
 *   node scripts/patch-matriz-2026-from-pdf.js \
 *     --pdf /caminho/para/nova_sequencia.pdf \
 *     [--segment EI01|EI02|EI03|ALL] \
 *     [--dry-run] \
 *     [--force]
 *
 * Flags:
 *   --dry-run   Simula sem gravar no banco (padrão: false)
 *   --force     Atualiza campos normativos mesmo com DiaryEvent vinculado (padrão: false)
 *   --segment   Segmento alvo (padrão: ALL — processa EI01, EI02 e EI03)
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const prisma = new PrismaClient();

const ALL_SEGMENTS = ['EI01', 'EI02', 'EI03'];

const SEGMENT_HEADERS = {
  EI01: 'ENSINO - BEBÊS',
  EI02: 'ENSINO - CRIANÇAS BEM PEQUENAS',
  EI03: 'ENSINO - CRIANÇAS PEQUENAS',
};

// ─── Utilitários ─────────────────────────────────────────────────────────────

function getPedagogicalDay(date) {
  const tz = process.env.APP_TIMEZONE || 'America/Sao_Paulo';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function normalize(str) {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
}

// ─── Extração de texto do PDF ─────────────────────────────────────────────────

function extractPdfText(pdfPath) {
  const script = [
    'import pdfplumber, sys',
    'all_text = []',
    'with pdfplumber.open(sys.argv[1]) as pdf:',
    '    for page in pdf.pages:',
    '        t = page.extract_text()',
    '        if t:',
    '            all_text.append(t)',
    "print('\\n'.join(all_text))",
  ].join('\n');

  const tmpScript = `/tmp/pdf_extract_${Date.now()}.py`;
  fs.writeFileSync(tmpScript, script);
  try {
    return childProcess.execSync(`python3 "${tmpScript}" "${pdfPath}"`, {
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf8',
    });
  } finally {
    try { fs.unlinkSync(tmpScript); } catch (_) {}
  }
}

// ─── Segmentação do texto ─────────────────────────────────────────────────────

function extractSegmentText(fullText, segment) {
  const header = SEGMENT_HEADERS[segment];
  const startIdx = fullText.indexOf(header);
  if (startIdx < 0) return '';

  let endIdx = fullText.length;
  for (const other of ALL_SEGMENTS.filter((s) => s !== segment)) {
    const otherIdx = fullText.indexOf(SEGMENT_HEADERS[other], startIdx + header.length);
    if (otherIdx > startIdx && otherIdx < endIdx) endIdx = otherIdx;
  }

  return fullText.substring(startIdx, endIdx);
}

// ─── Normalização de campo de experiência ─────────────────────────────────────

function normalizeCampo(text, bnccCode) {
  const n = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (n.includes('eu') && (n.includes('outro') || n.includes('nos')))
    return 'O_EU_O_OUTRO_E_O_NOS';
  if (n.includes('corpo') || n.includes('gestos') || n.includes('movimentos'))
    return 'CORPO_GESTOS_E_MOVIMENTOS';
  if (n.includes('tracos') || n.includes('sons') || n.includes('cores') || n.includes('formas'))
    return 'TRACOS_SONS_CORES_E_FORMAS';
  if (n.includes('escuta') || n.includes('fala') || n.includes('pensamento') || n.includes('imaginacao'))
    return 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO';
  if (n.includes('espaco') || n.includes('tempo') || n.includes('quantidade') || n.includes('relacoes') || n.includes('transformacoes'))
    return 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES';

  // Fallback pelo código BNCC (ex: artefato "---" com código EI02ET03)
  if (bnccCode) {
    const code = bnccCode.toUpperCase();
    if (code.includes('EO')) return 'O_EU_O_OUTRO_E_O_NOS';
    if (code.includes('CG')) return 'CORPO_GESTOS_E_MOVIMENTOS';
    if (code.includes('TS')) return 'TRACOS_SONS_CORES_E_FORMAS';
    if (code.includes('EF')) return 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO';
    if (code.includes('ET')) return 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES';
  }

  throw new Error(`Campo de Experiência não reconhecido: "${text}" (código: ${bnccCode || 'N/A'})`);
}

// ─── Parser de entradas ───────────────────────────────────────────────────────

function parseSegment(segmentText) {
  const entries = [];
  const seenDates = new Set();
  const lines = segmentText.split('\n');

  const contextMap = [];
  let pos = 0;
  let ctxBim = 1;
  let ctxWeek = 1;

  for (const line of lines) {
    const bimMatch = line.match(/(\d+)º BIMESTRE/i);
    if (bimMatch) ctxBim = parseInt(bimMatch[1], 10);
    const weekMatch = line.match(/SEMANA\s+(\d+)/i);
    if (weekMatch) ctxWeek = parseInt(weekMatch[1], 10);
    contextMap.push({ pos, bimester: ctxBim, week: ctxWeek });
    pos += line.length + 1;
  }

  const getContext = (charPos) => {
    let ctx = { bimester: 1, week: 1 };
    for (const c of contextMap) {
      if (c.pos <= charPos) ctx = c;
      else break;
    }
    return ctx;
  };

  const reconstructed = lines.join('\n');
  const entryRegex = /(\d{2})\/(\d{2})\s*[–\-]\s*([^(\n]+?)\s*\((EI\d+[A-Z]+\d+)\)/g;
  const rawEntries = [];

  let m;
  while ((m = entryRegex.exec(reconstructed)) !== null) {
    rawEntries.push({
      day: m[1], month: m[2], campo: m[3].trim(), bnccCode: m[4],
      startPos: m.index, endPos: m.index + m[0].length,
    });
  }

  for (let i = 0; i < rawEntries.length; i++) {
    const raw = rawEntries[i];
    const nextStart = i + 1 < rawEntries.length ? rawEntries[i + 1].startPos : reconstructed.length;
    const blockText = reconstructed.substring(raw.endPos, nextStart);

    const dateKey = `${raw.month}/${raw.day}`;
    if (seenDates.has(dateKey)) continue;
    seenDates.add(dateKey);

    const ctx = getContext(raw.startPos);

    const cleanLines = blockText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => !l.includes('MATRIZ CURRICULAR'))
      .filter((l) => !l.includes('Associação Beneficente'))
      .filter((l) => !l.match(/^(Seg|Ter|Qua|Qui|Sex|Sáb|Dom)\s/i))
      .filter((l) => !l.match(/^EI\d{2}\s*[–\-]/))
      .filter((l) => !l.match(/^\d+º BIMESTRE/i))
      .filter((l) => !l.match(/^SEMANA\s+\d+/i))
      .filter((l) => !l.match(/^Situação da semana/i))
      .filter((l) => !l.match(/^Semana de/i))
      .filter((l) => !l.match(/^Observação:/i));

    const cleanText = cleanLines.join(' ').replace(/\s+/g, ' ').trim();

    const sentences = cleanText
      .split(/\.\s+(?=[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÇ])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);

    const objetivoBNCC = sentences[0]
      ? (sentences[0].endsWith('.') ? sentences[0] : sentences[0] + '.')
      : '';
    const objetivoCurriculo = sentences[1]
      ? (sentences[1].endsWith('.') ? sentences[1] : sentences[1] + '.')
      : objetivoBNCC;
    const intencionalidade = sentences[2]
      ? (sentences[2].endsWith('.') ? sentences[2] : sentences[2] + '.')
      : undefined;
    const exemploAtividade = sentences.length >= 4
      ? sentences.slice(3).map((s) => (s.endsWith('.') ? s : s + '.')).join(' ')
      : undefined;

    const date = new Date(`2026-${raw.month}-${raw.day}T12:00:00-03:00`);
    const dayOfWeek = date.getDay();

    try {
      const campo = normalizeCampo(raw.campo, raw.bnccCode);
      entries.push({
        day: raw.day, month: raw.month, campo,
        bnccCode: raw.bnccCode,
        objetivoBNCC, objetivoCurriculo, intencionalidade, exemploAtividade,
        bimester: ctx.bimester, week: ctx.week, dayOfWeek,
      });
    } catch (e) {
      console.warn(`  [WARN] ${dateKey}: ${e.message}`);
    }
  }

  return entries;
}

// ─── Busca por dia pedagógico ─────────────────────────────────────────────────

async function findEntryByDay(matrixId, date) {
  const ymd = getPedagogicalDay(date);
  const start = new Date(`${ymd}T00:00:00-03:00`);
  const end = new Date(`${ymd}T23:59:59-03:00`);
  return prisma.curriculumMatrixEntry.findFirst({
    where: { matrixId, date: { gte: start, lte: end } },
  });
}

// ─── Patch de um segmento ─────────────────────────────────────────────────────

async function patchSegment(segment, pdfText, dryRun, force) {
  const result = {
    segment,
    matrixId: '',
    totalExtracted: 0,
    inserted: 0,
    updated: 0,
    skippedByHistory: 0,
    unchanged: 0,
    errors: [],
  };

  let matrix = await prisma.curriculumMatrix.findFirst({
    where: { year: 2026, segment, isActive: true },
  });

  if (!matrix) {
    matrix = await prisma.curriculumMatrix.findFirst({
      where: { year: 2026, segment },
      orderBy: { version: 'desc' },
    });
  }

  if (!matrix) {
    result.errors.push(`Matriz 2026 para ${segment} não encontrada no banco.`);
    console.log(`  [${segment}] ❌ Matriz não encontrada — verifique se a matriz 2026 foi criada.`);
    return result;
  }

  result.matrixId = matrix.id;

  const segmentText = extractSegmentText(pdfText, segment);
  if (!segmentText) {
    result.errors.push(`Segmento ${segment} não encontrado no PDF.`);
    return result;
  }

  const entries = parseSegment(segmentText);
  result.totalExtracted = entries.length;

  console.log(`\n  [${segment}] Matriz: ${matrix.id} | Extraídas: ${entries.length} entradas`);

  for (const entry of entries) {
    const date = new Date(`2026-${entry.month}-${entry.day}T12:00:00-03:00`);
    const dateKey = `${entry.day}/${entry.month}`;

    try {
      const existing = await findEntryByDay(matrix.id, date);

      if (existing) {
        const linkedEvents = await prisma.diaryEvent.count({
          where: { curriculumEntryId: existing.id },
        });

        if (linkedEvents > 0 && !force) {
          const nonNormativeUpdate = {};
          if (
            entry.intencionalidade &&
            entry.intencionalidade.length > 5 &&
            normalize(existing.intencionalidade) !== normalize(entry.intencionalidade)
          ) {
            nonNormativeUpdate.intencionalidade = entry.intencionalidade;
          }
          if (
            entry.exemploAtividade &&
            entry.exemploAtividade.length > 5 &&
            normalize(existing.exemploAtividade) !== normalize(entry.exemploAtividade)
          ) {
            nonNormativeUpdate.exemploAtividade = entry.exemploAtividade;
          }

          if (Object.keys(nonNormativeUpdate).length > 0) {
            if (!dryRun) {
              await prisma.curriculumMatrixEntry.update({
                where: { id: existing.id },
                data: nonNormativeUpdate,
              });
            }
            result.updated++;
            console.log(`  [${segment}] ${dateKey} → UPDATE (não-normativo, ${linkedEvents} eventos)`);
          } else {
            result.skippedByHistory++;
            console.log(`  [${segment}] ${dateKey} → SKIP (${linkedEvents} eventos, sem mudança)`);
          }
          continue;
        }

        const normativeChanged =
          normalize(existing.objetivoBNCC) !== normalize(entry.objetivoBNCC) ||
          normalize(existing.objetivoCurriculo) !== normalize(entry.objetivoCurriculo) ||
          existing.campoDeExperiencia !== entry.campo;

        const nonNormativeChanged =
          (entry.intencionalidade && normalize(existing.intencionalidade) !== normalize(entry.intencionalidade)) ||
          (entry.exemploAtividade && normalize(existing.exemploAtividade) !== normalize(entry.exemploAtividade));

        if (!normativeChanged && !nonNormativeChanged) {
          result.unchanged++;
          continue;
        }

        if (!dryRun) {
          if (force) {
            await prisma.curriculumMatrixEntry.update({
              where: { id: existing.id },
              data: {
                weekOfYear: entry.week,
                dayOfWeek: entry.dayOfWeek,
                bimester: entry.bimester,
                campoDeExperiencia: entry.campo,
                objetivoBNCC: entry.objetivoBNCC,
                objetivoBNCCCode: entry.bnccCode,
                objetivoCurriculo: entry.objetivoCurriculo,
                ...(entry.intencionalidade ? { intencionalidade: entry.intencionalidade } : {}),
                ...(entry.exemploAtividade ? { exemploAtividade: entry.exemploAtividade } : {}),
              },
            });
          } else {
            const updateData = {};
            if (entry.intencionalidade) updateData.intencionalidade = entry.intencionalidade;
            if (entry.exemploAtividade) updateData.exemploAtividade = entry.exemploAtividade;
            if (normativeChanged) {
              updateData.campoDeExperiencia = entry.campo;
              updateData.objetivoBNCC = entry.objetivoBNCC;
              updateData.objetivoBNCCCode = entry.bnccCode;
              updateData.objetivoCurriculo = entry.objetivoCurriculo;
              updateData.weekOfYear = entry.week;
              updateData.dayOfWeek = entry.dayOfWeek;
              updateData.bimester = entry.bimester;
            }
            if (Object.keys(updateData).length > 0) {
              await prisma.curriculumMatrixEntry.update({
                where: { id: existing.id },
                data: updateData,
              });
            }
          }
        }

        result.updated++;
        console.log(`  [${segment}] ${dateKey} → UPDATE (normativo=${normativeChanged})`);
      } else {
        if (!dryRun) {
          await prisma.curriculumMatrixEntry.create({
            data: {
              matrixId: matrix.id,
              date,
              weekOfYear: entry.week,
              dayOfWeek: entry.dayOfWeek,
              bimester: entry.bimester,
              campoDeExperiencia: entry.campo,
              objetivoBNCC: entry.objetivoBNCC,
              objetivoBNCCCode: entry.bnccCode,
              objetivoCurriculo: entry.objetivoCurriculo,
              intencionalidade: entry.intencionalidade,
              exemploAtividade: entry.exemploAtividade,
            },
          });
        }
        result.inserted++;
        console.log(`  [${segment}] ${dateKey} → INSERT`);
      }
    } catch (err) {
      const msg = `${dateKey}: ${err.message}`;
      result.errors.push(msg);
      console.error(`  [${segment}] ERRO ${msg}`);
    }
  }

  if (!dryRun && (result.inserted > 0 || result.updated > 0)) {
    await prisma.curriculumMatrix.update({
      where: { id: matrix.id },
      data: { updatedAt: new Date() },
    });
  }

  return result;
}

// ─── Relatório de duplicatas ──────────────────────────────────────────────────

async function checkDuplicates(segment) {
  const matrix = await prisma.curriculumMatrix.findFirst({
    where: { year: 2026, segment },
    orderBy: { version: 'desc' },
  });
  if (!matrix) return;

  const entries = await prisma.curriculumMatrixEntry.findMany({
    where: { matrixId: matrix.id },
    select: { id: true, date: true, updatedAt: true },
  });

  const byDay = new Map();
  for (const e of entries) {
    const day = getPedagogicalDay(e.date);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(e);
  }

  const dups = [...byDay.entries()].filter(([, arr]) => arr.length > 1);
  if (dups.length > 0) {
    console.log(`\n  [${segment}] ⚠️  ${dups.length} dias com duplicatas:`);
    for (const [day, arr] of dups) {
      console.log(`    ${day}: ${arr.map((e) => e.id).join(', ')}`);
    }
  } else {
    console.log(`  [${segment}] ✅ Sem duplicatas`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const pdfIdx = args.indexOf('--pdf');
  const pdfPath = pdfIdx >= 0 ? args[pdfIdx + 1] : null;
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const segmentIdx = args.indexOf('--segment');
  const segmentArg = segmentIdx >= 0 ? args[segmentIdx + 1] : 'ALL';

  if (!pdfPath || !fs.existsSync(pdfPath)) {
    console.error('\n❌ Arquivo PDF não encontrado.');
    console.error('Uso: node scripts/patch-matriz-2026-from-pdf.js --pdf <caminho.pdf> [--segment EI01|EI02|EI03|ALL] [--dry-run] [--force]');
    console.error('\nExemplo:');
    console.error('  node scripts/patch-matriz-2026-from-pdf.js --pdf /tmp/nova_sequencia.pdf --dry-run');
    process.exit(1);
  }

  const segments = segmentArg === 'ALL' ? ALL_SEGMENTS : [segmentArg];

  console.log(`\n${'='.repeat(60)}`);
  console.log(`PATCH MATRIZ 2026 — ${dryRun ? 'DRY-RUN (simulação)' : 'APPLY (gravando no banco)'} ${force ? '(FORCE)' : ''}`);
  console.log(`PDF: ${pdfPath}`);
  console.log(`Segmentos: ${segments.join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);

  console.log('Extraindo texto do PDF...');
  const pdfText = extractPdfText(pdfPath);
  console.log(`Texto extraído: ${pdfText.length} caracteres\n`);

  console.log('Verificando duplicatas antes do patch:');
  for (const seg of segments) {
    await checkDuplicates(seg);
  }

  const results = [];
  for (const seg of segments) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`Processando segmento: ${seg}`);
    const result = await patchSegment(seg, pdfText, dryRun, force);
    results.push(result);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('RESUMO FINAL:');
  console.log(`${'='.repeat(60)}`);
  for (const r of results) {
    console.log(`\n${r.segment} (matrixId: ${r.matrixId || 'NÃO ENCONTRADA'}):`);
    console.log(`  Extraídas:          ${r.totalExtracted}`);
    console.log(`  Inseridas:          ${r.inserted}`);
    console.log(`  Atualizadas:        ${r.updated}`);
    console.log(`  Skip (histórico):   ${r.skippedByHistory}`);
    console.log(`  Sem mudança:        ${r.unchanged}`);
    if (r.errors.length > 0) {
      console.log(`  Erros (${r.errors.length}):`);
      r.errors.forEach((e) => console.log(`    - ${e}`));
    }
  }

  if (dryRun) {
    console.log('\n⚠️  DRY-RUN: nenhuma alteração foi gravada no banco.');
    console.log('   Quando estiver pronto, rode sem --dry-run para aplicar.');
  } else {
    console.log('\n✅ Patch aplicado com sucesso.');
  }

  if (!dryRun) {
    console.log('\nVerificando duplicatas após o patch:');
    for (const seg of segments) {
      await checkDuplicates(seg);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('\n❌ Erro fatal:', err.message);
  prisma.$disconnect();
  process.exit(1);
});
