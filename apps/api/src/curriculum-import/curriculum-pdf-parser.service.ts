import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CampoDeExperiencia } from '@prisma/client';

/**
 * Interface para uma entrada extraída do PDF
 */
export interface ParsedMatrixEntry {
  date: Date;
  weekOfYear: number;
  dayOfWeek: number;
  bimester?: number;
  campoDeExperiencia: CampoDeExperiencia;
  objetivoBNCC: string;
  objetivoBNCCCode?: string;
  objetivoCurriculo: string;
  intencionalidade?: string;
  exemploAtividade?: string;
}

/**
 * Resultado do parsing do PDF
 */
export interface ParserResult {
  entries: ParsedMatrixEntry[];
  totalExtracted: number;
  errors: string[];
}

/**
 * Segmentos suportados
 */
export type MatrixSegment = 'EI01' | 'EI02' | 'EI03';

/**
 * Cabeçalhos que delimitam cada segmento no PDF
 */
const SEGMENT_HEADERS: Record<MatrixSegment, string> = {
  EI01: 'ENSINO - BEBÊS',
  EI02: 'ENSINO - CRIANÇAS BEM PEQUENAS',
  EI03: 'ENSINO - CRIANÇAS PEQUENAS',
};

/**
 * Limites das colunas do PDF (coordenadas x0 em pontos).
 *
 * O PDF da Matriz Curricular 2026 tem 6 colunas:
 *   DATA      :  55 – 138  (data + dia da semana)
 *   CAMPO     : 138 – 248  (campo de experiência)
 *   BNCC_CODE : 248 – 318  (código BNCC entre parênteses)
 *   OBJ_BNCC  : 318 – 462  (objetivo de aprendizagem BNCC)
 *   OBJ_CURR  : 462 – 647  (objetivo do currículo)
 *   INTENC    : 647 – 820  (intencionalidade pedagógica)
 */
const COL_BOUNDS: Record<string, [number, number]> = {
  data:      [55,  138],
  campo:     [138, 248],
  bncc_code: [248, 318],
  obj_bncc:  [318, 462],
  obj_curr:  [462, 647],
  intenc:    [647, 820],
};

@Injectable()
export class CurriculumPdfParserService {
  /**
   * Parse do PDF da Matriz Curricular 2026 para um segmento específico.
   *
   * Usa extração por colunas (extract_words + coordenadas X) para separar
   * corretamente os 6 campos de cada linha da tabela.
   *
   * @param pdfPath  - Caminho do arquivo PDF
   * @param segment  - Segmento alvo: 'EI01' | 'EI02' | 'EI03'
   */
  async parsePdf(pdfPath: string, segment: MatrixSegment = 'EI01'): Promise<ParserResult> {
    try {
      if (!fs.existsSync(pdfPath)) {
        throw new BadRequestException(`Arquivo PDF não encontrado: ${pdfPath}`);
      }

      // Extrair entradas via pdfplumber com coordenadas de coluna
      const jsonResult = await this.extractEntriesViaPython(pdfPath, segment);

      if (!jsonResult || jsonResult.length === 0) {
        throw new BadRequestException(
          `Nenhuma entrada válida encontrada para o segmento ${segment}. Verifique o formato do arquivo.`,
        );
      }

      const entries: ParsedMatrixEntry[] = [];
      const errors: string[] = [];

      for (const raw of jsonResult) {
        try {
          const date = new Date(`2026-${raw.month}-${raw.day}T12:00:00-03:00`);
          if (isNaN(date.getTime())) {
            errors.push(`Data inválida: ${raw.day}/${raw.month}`);
            continue;
          }

          const campoDeExperiencia = this.normalizeCampoDeExperiencia(raw.campo, raw.bnccCode);

          entries.push({
            date,
            weekOfYear: raw.week || 1,
            dayOfWeek: date.getDay(),
            bimester: raw.bimester || 1,
            campoDeExperiencia,
            objetivoBNCC: raw.objetivoBNCC,
            objetivoBNCCCode: raw.bnccCode,
            objetivoCurriculo: raw.objetivoCurriculo || raw.objetivoBNCC,
            intencionalidade: raw.intencionalidade || undefined,
            exemploAtividade: raw.exemploAtividade || undefined,
          });
        } catch (err) {
          errors.push(`Erro ao processar ${raw.day}/${raw.month}: ${err.message}`);
        }
      }

      if (entries.length === 0) {
        throw new BadRequestException(
          `Nenhuma entrada válida encontrada para o segmento ${segment}.`,
        );
      }

      return { entries, totalExtracted: entries.length, errors };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Erro ao fazer parse do PDF: ${error.message}`);
    }
  }

  /**
   * Extrai entradas do PDF usando pdfplumber com coordenadas de coluna.
   *
   * O script Python usa extract_words() para separar as 6 colunas da tabela
   * com base nas coordenadas X de cada palavra, garantindo que cada campo
   * seja extraído da coluna correta — independente do layout da linha.
   */
  private async extractEntriesViaPython(
    pdfPath: string,
    segment: MatrixSegment,
  ): Promise<
    Array<{
      day: string;
      month: string;
      campo: string;
      bnccCode: string;
      objetivoBNCC: string;
      objetivoCurriculo: string;
      intencionalidade: string;
      exemploAtividade: string;
      week: number;
      bimester: number;
    }>
  > {
    const { execSync } = await import('child_process');

    const colBoundsJson = JSON.stringify(COL_BOUNDS);
    const segmentHeadersJson = JSON.stringify(SEGMENT_HEADERS);

    const script = `
import pdfplumber, json, re, sys, unicodedata

PDF_PATH = sys.argv[1]
SEGMENT = sys.argv[2]

COL_BOUNDS = ${colBoundsJson}
SEGMENT_HEADERS = ${segmentHeadersJson}

CAMPO_MAP = [
    ('o eu', 'O_EU_O_OUTRO_E_O_NOS'),
    ('corpo', 'CORPO_GESTOS_E_MOVIMENTOS'),
    ('gestos', 'CORPO_GESTOS_E_MOVIMENTOS'),
    ('movimentos', 'CORPO_GESTOS_E_MOVIMENTOS'),
    ('tracos', 'TRACOS_SONS_CORES_E_FORMAS'),
    ('sons', 'TRACOS_SONS_CORES_E_FORMAS'),
    ('cores', 'TRACOS_SONS_CORES_E_FORMAS'),
    ('formas', 'TRACOS_SONS_CORES_E_FORMAS'),
    ('escuta', 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO'),
    ('fala', 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO'),
    ('pensamento', 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO'),
    ('imaginacao', 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO'),
    ('espaco', 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES'),
    ('tempo', 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES'),
    ('quantidade', 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES'),
    ('relacoes', 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES'),
    ('transformacoes', 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES'),
]

BNCC_CODE_MAP = {
    'EO': 'O_EU_O_OUTRO_E_O_NOS',
    'CG': 'CORPO_GESTOS_E_MOVIMENTOS',
    'TS': 'TRACOS_SONS_CORES_E_FORMAS',
    'EF': 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',
    'ET': 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',
}

def nfd(text):
    return ''.join(c for c in unicodedata.normalize('NFD', text.lower()) if unicodedata.category(c) != 'Mn')

def normalize_campo(text, bncc_code=''):
    n = nfd(text)
    for key, val in CAMPO_MAP:
        if nfd(key) in n:
            return val
    if bncc_code:
        for code_part, val in BNCC_CODE_MAP.items():
            if code_part in bncc_code.upper():
                return val
    return 'DESCONHECIDO'

def get_col(words, col_name, y_min, y_max):
    x_min, x_max = COL_BOUNDS[col_name]
    col_words = [
        w for w in words
        if w['x0'] >= x_min and w['x0'] < x_max
        and w['top'] >= y_min and w['bottom'] <= y_max + 8
    ]
    col_words.sort(key=lambda w: (round(w['top'] / 3) * 3, w['x0']))
    return ' '.join(w['text'] for w in col_words).strip()

def clean_field(text):
    text = re.sub(r'\\(EI\\d+[A-Z]+\\d+\\)', '', text)
    text = re.sub(r'\\s+', ' ', text).strip()
    return text

with pdfplumber.open(PDF_PATH) as pdf:
    # Mapear páginas por segmento
    seg_start = {}
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ''
        for seg, marker in SEGMENT_HEADERS.items():
            if marker in text and seg not in seg_start:
                seg_start[seg] = i

    sorted_segs = sorted(seg_start.items(), key=lambda x: x[1])
    seg_ranges = {}
    for idx, (seg, start) in enumerate(sorted_segs):
        end = sorted_segs[idx+1][1] if idx+1 < len(sorted_segs) else len(pdf.pages)
        seg_ranges[seg] = (start, end)

    if SEGMENT not in seg_ranges:
        print(json.dumps([]))
        sys.exit(0)

    pg_start, pg_end = seg_ranges[SEGMENT]
    entries = []
    seen_dates = set()
    current_bimester = 1
    current_week = 1

    for i in range(pg_start, pg_end):
        page = pdf.pages[i]
        text = page.extract_text() or ''

        # Detectar bimestre e semana pelo texto da página
        bim_match = re.search(r'(\\d+)º BIMESTRE', text, re.IGNORECASE)
        if bim_match:
            current_bimester = int(bim_match.group(1))
        week_match = re.search(r'SEMANA\\s+(\\d+)', text, re.IGNORECASE)
        if week_match:
            current_week = int(week_match.group(1))

        words = page.extract_words(x_tolerance=3, y_tolerance=3)

        # Todas as datas na página (formato DD/MM)
        all_dates_on_page = sorted(
            [w for w in words if re.match(r'^\\d{2}/\\d{2}$', w['text'])],
            key=lambda w: w['top']
        )

        for di, dw in enumerate(all_dates_on_page):
            date_str = dw['text']
            day, month = date_str.split('/')
            date_key = f"{month}/{day}"

            if date_key in seen_dates:
                continue

            row_y_min = dw['top'] - 2
            next_dw = all_dates_on_page[di+1] if di+1 < len(all_dates_on_page) else None
            row_y_max = (next_dw['top'] - 2) if next_dw else (dw['top'] + 130)

            # Extrair colunas
            campo_raw = get_col(words, 'campo', row_y_min, row_y_max)
            bncc_code_raw = get_col(words, 'bncc_code', row_y_min, row_y_max)
            obj_bncc_raw = get_col(words, 'obj_bncc', row_y_min, row_y_max)
            obj_curr_raw = get_col(words, 'obj_curr', row_y_min, row_y_max)
            intenc_raw = get_col(words, 'intenc', row_y_min, row_y_max)

            # Extrair código BNCC limpo
            bncc_match = re.search(r'(EI\\d+[A-Z]+\\d+)', bncc_code_raw)
            bncc_code = bncc_match.group(1) if bncc_match else ''

            # Pular linhas sem código BNCC (feriados, formações, dias não letivos)
            if not bncc_code:
                continue

            seen_dates.add(date_key)

            campo = normalize_campo(campo_raw, bncc_code)
            obj_bncc = clean_field(obj_bncc_raw)
            obj_curr = clean_field(obj_curr_raw)
            intenc = clean_field(intenc_raw)

            entries.append({
                'day': day,
                'month': month,
                'campo': campo,
                'bnccCode': bncc_code,
                'objetivoBNCC': obj_bncc,
                'objetivoCurriculo': obj_curr,
                'intencionalidade': intenc if intenc else '',
                'exemploAtividade': '',
                'week': current_week,
                'bimester': current_bimester,
            })

    print(json.dumps(entries, ensure_ascii=False))
`;

    const tmpScript = path.join('/tmp', `pdf_col_extract_${Date.now()}.py`);
    fs.writeFileSync(tmpScript, script);
    try {
      const result = execSync(`python3 "${tmpScript}" "${pdfPath}" "${segment}"`, {
        maxBuffer: 50 * 1024 * 1024,
        encoding: 'utf8',
      });
      return JSON.parse(result.trim());
    } finally {
      try {
        fs.unlinkSync(tmpScript);
      } catch (_) {}
    }
  }

  /**
   * Normaliza o campo de experiência para o enum Prisma.
   * Aceita também o código BNCC como fallback quando o texto do campo é inválido.
   */
  normalizeCampoDeExperiencia(text: string, bnccCode?: string): CampoDeExperiencia {
    const normalized = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (normalized === 'O_EU_O_OUTRO_E_O_NOS') return CampoDeExperiencia.O_EU_O_OUTRO_E_O_NOS;
    if (normalized === 'CORPO_GESTOS_E_MOVIMENTOS') return CampoDeExperiencia.CORPO_GESTOS_E_MOVIMENTOS;
    if (normalized === 'TRACOS_SONS_CORES_E_FORMAS') return CampoDeExperiencia.TRACOS_SONS_CORES_E_FORMAS;
    if (normalized === 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO') return CampoDeExperiencia.ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO;
    if (normalized === 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES') return CampoDeExperiencia.ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES;

    // Texto livre
    if (normalized.includes('eu') && (normalized.includes('outro') || normalized.includes('nos'))) {
      return CampoDeExperiencia.O_EU_O_OUTRO_E_O_NOS;
    }
    if (normalized.includes('corpo') || normalized.includes('gestos') || normalized.includes('movimentos')) {
      return CampoDeExperiencia.CORPO_GESTOS_E_MOVIMENTOS;
    }
    if (normalized.includes('tracos') || normalized.includes('sons') || normalized.includes('cores') || normalized.includes('formas')) {
      return CampoDeExperiencia.TRACOS_SONS_CORES_E_FORMAS;
    }
    if (normalized.includes('escuta') || normalized.includes('fala') || normalized.includes('pensamento') || normalized.includes('imaginacao')) {
      return CampoDeExperiencia.ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO;
    }
    if (
      normalized.includes('espacos') || normalized.includes('espaco') ||
      normalized.includes('tempos') || normalized.includes('quantidade') ||
      normalized.includes('relacoes') || normalized.includes('transformacoes')
    ) {
      return CampoDeExperiencia.ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES;
    }

    // Fallback pelo código BNCC
    if (bnccCode) {
      const code = bnccCode.toUpperCase();
      if (code.includes('EO')) return CampoDeExperiencia.O_EU_O_OUTRO_E_O_NOS;
      if (code.includes('CG')) return CampoDeExperiencia.CORPO_GESTOS_E_MOVIMENTOS;
      if (code.includes('TS')) return CampoDeExperiencia.TRACOS_SONS_CORES_E_FORMAS;
      if (code.includes('EF')) return CampoDeExperiencia.ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO;
      if (code.includes('ET')) return CampoDeExperiencia.ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES;
    }

    throw new Error(`Campo de Experiência não reconhecido: "${text}" (código: ${bnccCode || 'N/A'})`);
  }
}
