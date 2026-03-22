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

// ─── Extração por colunas (extract_words com coordenadas X) ──────────────────

// Limites de coluna X (em pontos) mapeados do PDF real
const COL_BOUNDS = {
  date:             [59,  140],
  campo:            [140, 245],
  bnccCode:         [245, 320],
  objetivoBNCC:     [320, 460],
  objetivoCurriculo:[460, 645],
  intencionalidade: [645, 800],
};

const SEGMENT_PAGE_HINTS = {
  EI01: 'BEBÊS',
  EI02: 'BEM PEQUENAS',
  EI03: 'CRIANÇAS PEQUENAS',
};

function extractEntriesFromPdf(pdfPath, segment) {
  const script = `
import pdfplumber, sys, json, re

COL_BOUNDS = {
    'date':              (59,  140),
    'campo':             (140, 245),
    'bnccCode':          (245, 320),
    'objetivoBNCC':      (320, 460),
    'objetivoCurriculo': (460, 645),
    'intencionalidade':  (645, 800),
}

SEGMENT_HEADERS = {
    'EI01': ['BEBÊS', 'BEBE', 'BEBES'],
    'EI02': ['BEM PEQUENAS', 'CRIANCAS BEM PEQUENAS'],
    'EI03': ['CRIANÇAS PEQUENAS', 'CRIANCAS PEQUENAS'],
}

DATE_RE = re.compile(r'^(\\d{2})/(\\d{2})$')
BNCC_RE = re.compile(r'^EI\\d{2}[A-Z]{2}\\d{2}$')

def words_in_col(words, x0, x1):
    return [w['text'] for w in words if w['x0'] >= x0 - 5 and w['x1'] <= x1 + 5]

def is_segment_page(page_text, segment):
    if not page_text:
        return False
    upper = page_text.upper()
    for hint in SEGMENT_HEADERS.get(segment, []):
        if hint in upper:
            return True
    return False

def extract_segment_entries(pdf_path, segment):
    entries = []
    in_segment = False
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ''
            if is_segment_page(page_text, segment):
                in_segment = True
            elif in_segment:
                # Verifica se entrou em outro segmento
                for other_seg, hints in SEGMENT_HEADERS.items():
                    if other_seg != segment:
                        for hint in hints:
                            if hint in page_text.upper():
                                in_segment = False
                                break
                    if not in_segment:
                        break
            if not in_segment:
                continue

            words = page.extract_words(x_tolerance=3, y_tolerance=3)
            # Agrupar palavras por linha (y0 similar)
            rows = {}
            for w in words:
                y = round(w['top'] / 4) * 4
                if y not in rows:
                    rows[y] = []
                rows[y].append(w)

            for y in sorted(rows.keys()):
                row_words = sorted(rows[y], key=lambda w: w['x0'])
                date_words = words_in_col(row_words, *COL_BOUNDS['date'])
                date_str = ' '.join(date_words).strip()
                m = DATE_RE.match(date_str.split()[0] if date_str else '')
                if not m:
                    continue
                day, month = m.group(1), m.group(2)
                campo_words = words_in_col(row_words, *COL_BOUNDS['campo'])
                bncc_words = words_in_col(row_words, *COL_BOUNDS['bnccCode'])
                obj_bncc_words = words_in_col(row_words, *COL_BOUNDS['objetivoBNCC'])
                obj_curr_words = words_in_col(row_words, *COL_BOUNDS['objetivoCurriculo'])
                intenc_words = words_in_col(row_words, *COL_BOUNDS['intencionalidade'])

                bncc_code = ' '.join(bncc_words).strip()
                if not BNCC_RE.match(bncc_code):
                    continue

                entries.append({
                    'day': day,
                    'month': month,
                    'campo': ' '.join(campo_words).strip(),
                    'bnccCode': bncc_code,
                    'objetivoBNCC': ' '.join(obj_bncc_words).strip(),
                    'objetivoCurriculo': ' '.join(obj_curr_words).strip(),
                    'intencionalidade': ' '.join(intenc_words).strip(),
                    'exemploAtividade': '',
                    'week': 1,
                    'bimester': 1,
                })
    return entries

result = extract_segment_entries(sys.argv[1], sys.argv[2])
print(json.dumps(result, ensure_ascii=False))
`;

  const tmpScript = `/tmp/pdf_col_extract_${Date.now()}.py`;
  fs.writeFileSync(tmpScript, script);
  try {
    const output = childProcess.execSync(
      `python3 "${tmpScript}" "${pdfPath}" "${segment}"`,
      { maxBuffer: 50 * 1024 * 1024, encoding: 'utf8' },
    );
    return JSON.parse(output);
  } finally {
    try { fs.unlinkSync(tmpScript); } catch (_) {}
  }
}

// (segmentação agora é feita pelo Python via extract_words por colunas)

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

// ─── Processamento de entradas brutas (retorno do Python) ─────────────────────

function processRawEntries(rawEntries) {
  const entries = [];
  const seenDates = new Set();

  for (const raw of rawEntries) {
    const dateKey = `${raw.month}/${raw.day}`;
    if (seenDates.has(dateKey)) continue;
    seenDates.add(dateKey);

    const date = new Date(`2026-${raw.month}-${raw.day}T12:00:00-03:00`);
    if (isNaN(date.getTime())) continue;

    const objetivoBNCC = normalize(raw.objetivoBNCC) || '';
    const objetivoCurriculo = normalize(raw.objetivoCurriculo) || objetivoBNCC;
    const intencionalidade = normalize(raw.intencionalidade) || undefined;
    const exemploAtividade = normalize(raw.exemploAtividade) || undefined;

    try {
      const campo = normalizeCampo(raw.campo, raw.bnccCode);
      entries.push({
        day: raw.day, month: raw.month, campo,
        bnccCode: raw.bnccCode,
        objetivoBNCC, objetivoCurriculo, intencionalidade, exemploAtividade,
        bimester: raw.bimester || 1, week: raw.week || 1,
        dayOfWeek: date.getDay(),
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

async function patchSegment(segment, pdfPath, dryRun, force, fillMissingOnly) {
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

  let rawEntries;
  try {
    rawEntries = extractEntriesFromPdf(pdfPath, segment);
  } catch (e) {
    result.errors.push(`Erro ao extrair PDF para ${segment}: ${e.message}`);
    return result;
  }

  if (!rawEntries || rawEntries.length === 0) {
    result.errors.push(`Segmento ${segment} não encontrado no PDF ou sem entradas válidas.`);
    return result;
  }

  const entries = processRawEntries(rawEntries);
  result.totalExtracted = entries.length;

  console.log(`\n  [${segment}] Matriz: ${matrix.id} | Extraídas: ${entries.length} entradas`);

  for (const entry of entries) {
    const date = new Date(`2026-${entry.month}-${entry.day}T12:00:00-03:00`);
    const dateKey = `${entry.day}/${entry.month}`;

    try {
      const existing = await findEntryByDay(matrix.id, date);

      if (existing) {
        if (fillMissingOnly) {
          // Modo fill-missing-only: só preenche campos vazios, nunca sobrescreve
          const updateData = {};
          if (!existing.objetivoBNCC && entry.objetivoBNCC) updateData.objetivoBNCC = entry.objetivoBNCC;
          if (!existing.objetivoCurriculo && entry.objetivoCurriculo) updateData.objetivoCurriculo = entry.objetivoCurriculo;
          if (!existing.intencionalidade && entry.intencionalidade) updateData.intencionalidade = entry.intencionalidade;
          if (!existing.exemploAtividade && entry.exemploAtividade) updateData.exemploAtividade = entry.exemploAtividade;
          if (Object.keys(updateData).length > 0) {
            if (!dryRun) {
              await prisma.curriculumMatrixEntry.update({ where: { id: existing.id }, data: updateData });
            }
            result.updated++;
            console.log(`  [${segment}] ${dateKey} → FILL (${Object.keys(updateData).join(', ')})`);
          } else {
            result.unchanged++;
          }
          continue;
        }

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
  const fillMissingOnly = args.includes('--fill-missing-only');
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
  console.log(`PATCH MATRIZ 2026 — ${dryRun ? 'DRY-RUN (simulação)' : 'APPLY (gravando no banco)'} ${force ? '(FORCE)' : ''} ${fillMissingOnly ? '(FILL-MISSING-ONLY)' : ''}`);
  console.log(`PDF: ${pdfPath}`);
  console.log(`Segmentos: ${segments.join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);

  console.log('Verificando duplicatas antes do patch:');
  for (const seg of segments) {
    await checkDuplicates(seg);
  }

  const results = [];
  for (const seg of segments) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`Processando segmento: ${seg}`);
    const result = await patchSegment(seg, pdfPath, dryRun, force, fillMissingOnly);
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
