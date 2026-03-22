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

@Injectable()
export class CurriculumPdfParserService {
  /**
   * Parse do PDF da Matriz Curricular 2026 para um segmento específico.
   *
   * O PDF contém EI01 + EI02 + EI03 em sequência.
   * O parser recorta o texto apenas no trecho do segmento solicitado,
   * evitando que datas repetidas entre segmentos sejam deduplicadas incorretamente.
   *
   * @param pdfPath  - Caminho do arquivo PDF
   * @param segment  - Segmento alvo: 'EI01' | 'EI02' | 'EI03'
   */
  async parsePdf(pdfPath: string, segment: MatrixSegment = 'EI01'): Promise<ParserResult> {
    try {
      if (!fs.existsSync(pdfPath)) {
        throw new BadRequestException(`Arquivo PDF não encontrado: ${pdfPath}`);
      }

      // Extrair texto via pdfplumber (Python) — mais fiel ao layout de tabelas
      const text = await this.extractTextViaPython(pdfPath);

      if (!text || text.trim().length === 0) {
        throw new BadRequestException('PDF está vazio ou não contém texto extraível');
      }

      // Recortar apenas o trecho do segmento solicitado
      const segmentText = this.extractSegmentText(text, segment);

      if (!segmentText || segmentText.trim().length === 0) {
        throw new BadRequestException(
          `Segmento ${segment} não encontrado no PDF. Verifique o formato do arquivo.`,
        );
      }

      // Parse do conteúdo do segmento
      const { entries, errors } = this.extractEntries(segmentText, segment);

      if (entries.length === 0) {
        throw new BadRequestException(
          `Nenhuma entrada válida encontrada para o segmento ${segment}. Verifique o formato do arquivo.`,
        );
      }

      return {
        entries,
        totalExtracted: entries.length,
        errors,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Erro ao fazer parse do PDF: ${error.message}`);
    }
  }

  /**
   * Extrai o texto do PDF usando pdfplumber via Python subprocess.
   * Mais robusto que pdf-parse para tabelas com múltiplas colunas.
   */
  private async extractTextViaPython(pdfPath: string): Promise<string> {
    const { execSync } = await import('child_process');
    const script = `
import pdfplumber, sys
all_text = []
with pdfplumber.open(sys.argv[1]) as pdf:
    for page in pdf.pages:
        t = page.extract_text()
        if t:
            all_text.append(t)
print('\\n'.join(all_text))
`;
    const tmpScript = path.join('/tmp', `pdf_extract_${Date.now()}.py`);
    fs.writeFileSync(tmpScript, script);
    try {
      const result = execSync(`python3 "${tmpScript}" "${pdfPath}"`, {
        maxBuffer: 50 * 1024 * 1024,
        encoding: 'utf8',
      });
      return result;
    } finally {
      fs.unlinkSync(tmpScript);
    }
  }

  /**
   * Recorta o texto do PDF para o trecho correspondente ao segmento solicitado.
   * Garante que seenDates seja isolado por segmento.
   */
  private extractSegmentText(fullText: string, segment: MatrixSegment): string {
    const header = SEGMENT_HEADERS[segment];
    const startIdx = fullText.indexOf(header);
    if (startIdx < 0) return '';

    // Encontrar o próximo cabeçalho de segmento (se existir)
    const otherSegments = (Object.keys(SEGMENT_HEADERS) as MatrixSegment[]).filter(
      (s) => s !== segment,
    );
    let endIdx = fullText.length;
    for (const other of otherSegments) {
      const otherHeader = SEGMENT_HEADERS[other];
      const otherIdx = fullText.indexOf(otherHeader, startIdx + header.length);
      if (otherIdx > startIdx && otherIdx < endIdx) {
        endIdx = otherIdx;
      }
    }

    return fullText.substring(startIdx, endIdx);
  }

  /**
   * Extrai entradas do texto de um segmento.
   *
   * Formato das linhas no PDF (após extração pdfplumber):
   *   "09/02 – O eu, o outro e o nós (EI01EO03) Estabelecer vínculos... Perceber o ambiente... Favorecer a adaptação..."
   *   "Seg vínculos afetivos com adultos..."  ← continuação da linha anterior
   *
   * Estratégia:
   * 1. Encontrar todas as linhas que começam com DD/MM seguido de traço
   * 2. Para cada linha, extrair campo de experiência, código BNCC e textos
   * 3. Detectar semana e bimestre pelo cabeçalho anterior
   */
  private extractEntries(
    text: string,
    segment: MatrixSegment,
  ): { entries: ParsedMatrixEntry[]; errors: string[] } {
    const entries: ParsedMatrixEntry[] = [];
    const errors: string[] = [];
    const seenDates = new Set<string>();
    const currentYear = 2026;

    // Padrão de entrada: DD/MM – <campo> (EIxxYYnn) <objetivoBNCC> <objetivoCurriculo> <intencionalidade>
    // O dia da semana (Seg/Ter/Qua/Qui/Sex) aparece na linha seguinte, antes do restante do texto
    const entryPattern = /(\d{2})\/(\d{2})\s*[–\-]\s*([^(]+?)\s*\((EI\d+[A-Z]+\d+)\)\s*([\s\S]*?)(?=\d{2}\/\d{2}\s*[–\-]|EI\d{2}\s*[–\-]|$)/g;

    // Detectar bimestre e semana a partir de cabeçalhos
    const bimesterPattern = /(\d+)º BIMESTRE/gi;
    const weekPattern = /SEMANA\s+(\d+)/gi;

    let currentBimester = 1;
    let currentWeek = 1;

    // Processar linha por linha para detectar contexto de bimestre/semana
    const lines = text.split('\n');
    let reconstructedText = '';

    for (const line of lines) {
      // Detectar bimestre
      const bimMatch = line.match(/(\d+)º BIMESTRE/i);
      if (bimMatch) {
        currentBimester = parseInt(bimMatch[1], 10);
      }

      // Detectar semana
      const weekMatch = line.match(/SEMANA\s+(\d+)/i);
      if (weekMatch) {
        currentWeek = parseInt(weekMatch[1], 10);
      }

      reconstructedText += line + '\n';
    }

    // Agora extrair entradas com regex
    let match: RegExpExecArray | null;
    entryPattern.lastIndex = 0;

    // Reprocessar com contexto de bimestre/semana por posição
    // Construir mapa de posição → {bimester, week}
    const contextMap: Array<{ pos: number; bimester: number; week: number }> = [];
    let ctxBim = 1;
    let ctxWeek = 1;
    let pos = 0;

    for (const line of lines) {
      const bimMatch = line.match(/(\d+)º BIMESTRE/i);
      if (bimMatch) ctxBim = parseInt(bimMatch[1], 10);
      const weekMatch = line.match(/SEMANA\s+(\d+)/i);
      if (weekMatch) ctxWeek = parseInt(weekMatch[1], 10);
      contextMap.push({ pos, bimester: ctxBim, week: ctxWeek });
      pos += line.length + 1;
    }

    const getContext = (charPos: number): { bimester: number; week: number } => {
      let ctx = { bimester: 1, week: 1 };
      for (const c of contextMap) {
        if (c.pos <= charPos) ctx = c;
        else break;
      }
      return ctx;
    };

    // Extrair entradas
    const entryRegex = /(\d{2})\/(\d{2})\s*[–\-]\s*([^(\n]+?)\s*\((EI\d+[A-Z]+\d+)\)/g;
    let m: RegExpExecArray | null;

    const rawEntries: Array<{
      day: string;
      month: string;
      campo: string;
      bnccCode: string;
      startPos: number;
      endPos: number;
    }> = [];

    while ((m = entryRegex.exec(reconstructedText)) !== null) {
      rawEntries.push({
        day: m[1],
        month: m[2],
        campo: m[3].trim(),
        bnccCode: m[4],
        startPos: m.index,
        endPos: m.index + m[0].length,
      });
    }

    for (let i = 0; i < rawEntries.length; i++) {
      const raw = rawEntries[i];
      const nextStart = i + 1 < rawEntries.length ? rawEntries[i + 1].startPos : reconstructedText.length;
      const blockText = reconstructedText.substring(raw.endPos, nextStart);

      try {
        const dateStr = `${currentYear}-${raw.month}-${raw.day}`;
        const date = new Date(`${dateStr}T12:00:00-03:00`);

        if (isNaN(date.getTime())) {
          errors.push(`Data inválida: ${raw.day}/${raw.month}`);
          continue;
        }

        const dateKey = `${raw.month}/${raw.day}`;
        if (seenDates.has(dateKey)) {
          errors.push(`Data duplicada ignorada no segmento: ${dateKey}`);
          continue;
        }
        seenDates.add(dateKey);

        const ctx = getContext(raw.startPos);
        const campoDeExperiencia = this.normalizeCampoDeExperiencia(raw.campo);
        const dayOfWeek = this.inferDayOfWeek(date);

        // Extrair textos do bloco: objetivoBNCC, objetivoCurriculo, intencionalidade
        const { objetivoBNCC, objetivoCurriculo, intencionalidade, exemploAtividade } =
          this.parseBlockTexts(blockText, raw.bnccCode);

        if (!objetivoBNCC || objetivoBNCC.length < 5) {
          errors.push(`Objetivo BNCC muito curto para ${dateKey}: "${objetivoBNCC}"`);
          continue;
        }

        entries.push({
          date,
          weekOfYear: ctx.week,
          dayOfWeek,
          bimester: ctx.bimester,
          campoDeExperiencia,
          objetivoBNCC,
          objetivoBNCCCode: raw.bnccCode,
          objetivoCurriculo: objetivoCurriculo || objetivoBNCC,
          intencionalidade: intencionalidade || undefined,
          exemploAtividade: exemploAtividade || undefined,
        });
      } catch (error) {
        errors.push(`Erro ao processar ${raw.day}/${raw.month}: ${error.message}`);
      }
    }

    return { entries, errors };
  }

  /**
   * Parseia os textos do bloco após o código BNCC.
   *
   * O layout extraído pelo pdfplumber para uma linha de tabela é:
   * "<objetivoBNCC completo> <objetivoCurriculo> <intencionalidade>"
   * com o dia da semana (Seg/Ter/...) no início da próxima linha.
   *
   * Estratégia: dividir por sentenças e usar heurística de comprimento.
   */
  private parseBlockTexts(
    blockText: string,
    bnccCode: string,
  ): {
    objetivoBNCC: string;
    objetivoCurriculo: string;
    intencionalidade?: string;
    exemploAtividade?: string;
  } {
    // Limpar o bloco: remover cabeçalhos de página e linhas de dia da semana
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

    if (!cleanText) {
      return { objetivoBNCC: '', objetivoCurriculo: '' };
    }

    // Dividir em sentenças por ponto final seguido de maiúscula
    const sentences = cleanText
      .split(/\.\s+(?=[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÇ])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);

    if (sentences.length === 0) {
      return { objetivoBNCC: cleanText, objetivoCurriculo: cleanText };
    }

    // Primeira sentença: objetivo BNCC (já sem o código, que foi extraído antes)
    const objetivoBNCC = sentences[0].endsWith('.') ? sentences[0] : sentences[0] + '.';

    if (sentences.length === 1) {
      return { objetivoBNCC, objetivoCurriculo: objetivoBNCC };
    }

    // Segunda sentença: objetivo currículo
    const objetivoCurriculo = sentences[1].endsWith('.') ? sentences[1] : sentences[1] + '.';

    // Terceira sentença: intencionalidade pedagógica
    let intencionalidade: string | undefined;
    if (sentences.length >= 3) {
      intencionalidade = sentences[2].endsWith('.') ? sentences[2] : sentences[2] + '.';
    }

    // Quarta sentença em diante: exemplo de atividade (se existir)
    let exemploAtividade: string | undefined;
    if (sentences.length >= 4) {
      exemploAtividade = sentences
        .slice(3)
        .map((s) => (s.endsWith('.') ? s : s + '.'))
        .join(' ');
    }

    return { objetivoBNCC, objetivoCurriculo, intencionalidade, exemploAtividade };
  }

  /**
   * Infere o dia da semana a partir da data (0=Dom, 1=Seg, ..., 6=Sáb)
   */
  private inferDayOfWeek(date: Date): number {
    return date.getDay();
  }

  /**
   * Normaliza o campo de experiência para o enum Prisma
   */
  private normalizeCampoDeExperiencia(text: string): CampoDeExperiencia {
    const normalized = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (normalized.includes('eu') && (normalized.includes('outro') || normalized.includes('nos'))) {
      return CampoDeExperiencia.O_EU_O_OUTRO_E_O_NOS;
    }
    if (
      normalized.includes('corpo') ||
      normalized.includes('gestos') ||
      normalized.includes('movimentos')
    ) {
      return CampoDeExperiencia.CORPO_GESTOS_E_MOVIMENTOS;
    }
    if (
      normalized.includes('tracos') ||
      normalized.includes('sons') ||
      normalized.includes('cores') ||
      normalized.includes('formas')
    ) {
      return CampoDeExperiencia.TRACOS_SONS_CORES_E_FORMAS;
    }
    if (
      normalized.includes('escuta') ||
      normalized.includes('fala') ||
      normalized.includes('pensamento') ||
      normalized.includes('imaginacao')
    ) {
      return CampoDeExperiencia.ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO;
    }
    if (
      normalized.includes('espacos') ||
      normalized.includes('espaco') ||
      normalized.includes('tempos') ||
      normalized.includes('quantidade') ||
      normalized.includes('relacoes') ||
      normalized.includes('transformacoes')
    ) {
      return CampoDeExperiencia.ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES;
    }

    throw new Error(`Campo de Experiência não reconhecido: "${text}"`);
  }
}
