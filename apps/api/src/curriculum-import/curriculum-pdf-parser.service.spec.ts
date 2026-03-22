/**
 * Testes unitários do CurriculumPdfParserService
 *
 * Cobertura:
 * 1. Segmentação EI01/EI02/EI03 — datas repetidas entre segmentos não são deduplicadas
 * 2. Normalização de CampoDeExperiencia
 * 3. Extração de entradas com código BNCC
 * 4. Isolamento de seenDates por segmento
 */

import { CurriculumPdfParserService, MatrixSegment } from './curriculum-pdf-parser.service';
import { CampoDeExperiencia } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';

// ─── Helpers de fixture ───────────────────────────────────────────────────────

/**
 * Cria um texto de PDF simulado com múltiplos segmentos.
 * Usado para testar que a segmentação isola corretamente cada EI.
 */
function buildMockPdfText(options?: {
  ei01Dates?: string[];
  ei02Dates?: string[];
  ei03Dates?: string[];
}): string {
  const ei01Dates = options?.ei01Dates ?? ['09/02'];
  const ei02Dates = options?.ei02Dates ?? ['09/02', '10/02'];
  const ei03Dates = options?.ei03Dates ?? ['09/02'];

  const makeEntry = (date: string, seg: string, idx: number) => {
    const campos = [
      { name: 'O eu, o outro e o nós', code: `${seg}EO0${idx + 1}` },
      { name: 'Corpo, gestos e movimentos', code: `${seg}CG0${idx + 1}` },
      { name: 'Traços, sons, cores e formas', code: `${seg}TS0${idx + 1}` },
    ];
    const campo = campos[idx % campos.length];
    return `${date} – ${campo.name} (${campo.code}) Objetivo BNCC ${seg} ${date}. Objetivo currículo ${seg} ${date}. Intencionalidade ${seg} ${date}.`;
  };

  const ei01Block = ei01Dates.map((d, i) => makeEntry(d, 'EI01', i)).join('\n');
  const ei02Block = ei02Dates.map((d, i) => makeEntry(d, 'EI02', i)).join('\n');
  const ei03Block = ei03Dates.map((d, i) => makeEntry(d, 'EI03', i)).join('\n');

  return `
ENSINO - BEBÊS
${ei01Block}

ENSINO - CRIANÇAS BEM PEQUENAS
${ei02Block}

ENSINO - CRIANÇAS PEQUENAS
${ei03Block}
`.trim();
}

// ─── Mock do pdfplumber ───────────────────────────────────────────────────────

/**
 * Substitui extractTextViaPython para retornar texto mock sem chamar Python.
 */
function mockExtractText(service: CurriculumPdfParserService, mockText: string): void {
  (service as any).extractTextViaPython = jest.fn().mockResolvedValue(mockText);
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('CurriculumPdfParserService', () => {
  let service: CurriculumPdfParserService;

  beforeEach(() => {
    service = new CurriculumPdfParserService();
  });

  // ── 1. Segmentação ──────────────────────────────────────────────────────────

  describe('segmentação por EI01/EI02/EI03', () => {
    it('deve retornar apenas entradas do segmento EI01 quando solicitado', async () => {
      const mockText = buildMockPdfText({
        ei01Dates: ['09/02'],
        ei02Dates: ['10/02', '11/02'],
        ei03Dates: ['12/02'],
      });
      mockExtractText(service, mockText);

      const result = await service.parsePdf('/fake/path.pdf', 'EI01');

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].objetivoBNCC).toContain('EI01');
      expect(result.entries[0].objetivoBNCC).toContain('09/02');
    });

    it('deve retornar apenas entradas do segmento EI02 quando solicitado', async () => {
      const mockText = buildMockPdfText({
        ei01Dates: ['09/02'],
        ei02Dates: ['10/02', '11/02'],
        ei03Dates: ['12/02'],
      });
      mockExtractText(service, mockText);

      const result = await service.parsePdf('/fake/path.pdf', 'EI02');

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].objetivoBNCC).toContain('EI02');
    });

    it('deve retornar apenas entradas do segmento EI03 quando solicitado', async () => {
      const mockText = buildMockPdfText({
        ei01Dates: ['09/02'],
        ei02Dates: ['10/02'],
        ei03Dates: ['12/02', '13/02'],
      });
      mockExtractText(service, mockText);

      const result = await service.parsePdf('/fake/path.pdf', 'EI03');

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].objetivoBNCC).toContain('EI03');
    });

    it('deve tratar mesma data em EI01 e EI02 como entradas distintas (não deduplicar entre segmentos)', async () => {
      // Mesma data "09/02" em EI01 e EI02
      const mockText = buildMockPdfText({
        ei01Dates: ['09/02'],
        ei02Dates: ['09/02'],
        ei03Dates: [],
      });
      mockExtractText(service, mockText);

      const ei01Result = await service.parsePdf('/fake/path.pdf', 'EI01');
      const ei02Result = await service.parsePdf('/fake/path.pdf', 'EI02');

      // Ambos devem ter 1 entrada para 09/02
      expect(ei01Result.entries).toHaveLength(1);
      expect(ei02Result.entries).toHaveLength(1);

      // Os objetivos devem ser diferentes (EI01 vs EI02)
      expect(ei01Result.entries[0].objetivoBNCC).toContain('EI01');
      expect(ei02Result.entries[0].objetivoBNCC).toContain('EI02');
    });

    it('deve lançar BadRequestException se o segmento não for encontrado no PDF', async () => {
      const mockText = 'ENSINO - BEBÊS\n09/02 – O eu, o outro e o nós (EI01EO01) Objetivo.';
      mockExtractText(service, mockText);

      // EI03 não está no mock
      await expect(service.parsePdf('/fake/path.pdf', 'EI03')).rejects.toThrow(
        /Segmento EI03 não encontrado/,
      );
    });
  });

  // ── 2. Normalização de CampoDeExperiencia ───────────────────────────────────

  describe('normalizeCampoDeExperiencia (via parsePdf)', () => {
    const testCases: Array<{ input: string; expected: CampoDeExperiencia }> = [
      {
        input: 'O eu, o outro e o nós',
        expected: CampoDeExperiencia.O_EU_O_OUTRO_E_O_NOS,
      },
      {
        input: 'Corpo, gestos e movimentos',
        expected: CampoDeExperiencia.CORPO_GESTOS_E_MOVIMENTOS,
      },
      {
        input: 'Traços, sons, cores e formas',
        expected: CampoDeExperiencia.TRACOS_SONS_CORES_E_FORMAS,
      },
      {
        input: 'Escuta, fala, pensamento e imaginação',
        expected: CampoDeExperiencia.ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO,
      },
      {
        input: 'Espaços, tempos, quantidades, relações e transformações',
        expected: CampoDeExperiencia.ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES,
      },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`deve normalizar "${input}" para ${expected}`, async () => {
        const mockText = `ENSINO - BEBÊS\n09/02 – ${input} (EI01EO01) Objetivo BNCC. Objetivo currículo. Intencionalidade.`;
        mockExtractText(service, mockText);

        const result = await service.parsePdf('/fake/path.pdf', 'EI01');

        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].campoDeExperiencia).toBe(expected);
      });
    });
  });

  // ── 3. Extração de código BNCC ───────────────────────────────────────────────

  describe('extração de código BNCC', () => {
    it('deve extrair o código BNCC corretamente', async () => {
      const mockText = `ENSINO - BEBÊS\n09/02 – O eu, o outro e o nós (EI01EO03) Objetivo BNCC. Objetivo currículo.`;
      mockExtractText(service, mockText);

      const result = await service.parsePdf('/fake/path.pdf', 'EI01');

      expect(result.entries[0].objetivoBNCCCode).toBe('EI01EO03');
    });

    it('deve extrair a data corretamente como Date de 2026', async () => {
      const mockText = `ENSINO - BEBÊS\n09/02 – O eu, o outro e o nós (EI01EO01) Objetivo BNCC. Objetivo currículo.`;
      mockExtractText(service, mockText);

      const result = await service.parsePdf('/fake/path.pdf', 'EI01');

      const entry = result.entries[0];
      expect(entry.date).toBeInstanceOf(Date);
      expect(entry.date.getFullYear()).toBe(2026);
      expect(entry.date.getMonth()).toBe(1); // Fevereiro = 1 (0-indexed)
      expect(entry.date.getDate()).toBe(9);
    });
  });

  // ── 4. Deduplicação dentro do mesmo segmento ─────────────────────────────────

  describe('deduplicação dentro do segmento', () => {
    it('deve ignorar datas duplicadas dentro do mesmo segmento', async () => {
      // Dois blocos com a mesma data no mesmo segmento
      const mockText = `ENSINO - BEBÊS
09/02 – O eu, o outro e o nós (EI01EO01) Objetivo 1. Currículo 1.
09/02 – Corpo, gestos e movimentos (EI01CG01) Objetivo 2. Currículo 2.
10/02 – Traços, sons, cores e formas (EI01TS01) Objetivo 3. Currículo 3.`;
      mockExtractText(service, mockText);

      const result = await service.parsePdf('/fake/path.pdf', 'EI01');

      // 09/02 duplicada deve ser ignorada, só 2 entradas únicas
      expect(result.entries).toHaveLength(2);
      expect(result.errors.some((e) => e.includes('duplicada'))).toBe(true);
    });
  });

  // ── 5. Múltiplas entradas por segmento ──────────────────────────────────────

  describe('múltiplas entradas', () => {
    it('deve extrair todas as entradas de EI02 com datas distintas', async () => {
      const mockText = buildMockPdfText({
        ei01Dates: ['09/02'],
        ei02Dates: ['19/02', '20/02', '23/02', '24/02', '25/02'],
        ei03Dates: ['01/06'],
      });
      mockExtractText(service, mockText);

      const result = await service.parsePdf('/fake/path.pdf', 'EI02');

      expect(result.entries).toHaveLength(5);
      expect(result.totalExtracted).toBe(5);
      expect(result.errors).toHaveLength(0);
    });
  });
});
