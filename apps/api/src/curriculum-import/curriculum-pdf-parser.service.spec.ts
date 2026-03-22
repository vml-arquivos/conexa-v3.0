/**
 * Testes unitários do CurriculumPdfParserService
 *
 * Cobertura:
 * 1. Segmentação EI01/EI02/EI03 — datas repetidas entre segmentos não são deduplicadas
 * 2. Normalização de CampoDeExperiencia (método público)
 * 3. Extração de entradas com código BNCC
 * 4. Extração correta de todos os campos (objetivoBNCC, objetivoCurriculo, intencionalidade)
 */

import { CurriculumPdfParserService } from './curriculum-pdf-parser.service';
import { CampoDeExperiencia } from '@prisma/client';
import * as fs from 'fs';

// Mock do módulo fs para controlar existsSync nos testes
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

type RawEntry = {
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
};

function makeRawEntry(overrides: Partial<RawEntry> = {}): RawEntry {
  return {
    day: '09',
    month: '02',
    campo: 'O_EU_O_OUTRO_E_O_NOS',
    bnccCode: 'EI01EO03',
    objetivoBNCC: 'Estabelecer vínculos afetivos com adultos.',
    objetivoCurriculo: 'Perceber o ambiente como espaço de cuidado.',
    intencionalidade: 'Favorecer a adaptação e o vínculo afetivo.',
    exemploAtividade: '',
    week: 1,
    bimester: 1,
    ...overrides,
  };
}

/**
 * Mocka extractEntriesViaPython para retornar dados sem chamar Python.
 * Também mocka fs.existsSync para retornar true (arquivo "existe").
 */
function mockExtractEntries(
  service: CurriculumPdfParserService,
  entries: RawEntry[],
): void {
  (fs.existsSync as jest.Mock).mockReturnValue(true);
  (service as any).extractEntriesViaPython = jest.fn().mockResolvedValue(entries);
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('CurriculumPdfParserService', () => {
  let service: CurriculumPdfParserService;

  beforeEach(() => {
    service = new CurriculumPdfParserService();
    jest.restoreAllMocks();
  });

  // ── 1. Extração básica ──────────────────────────────────────────────────────

  describe('extração básica', () => {
    it('deve retornar entrada com todos os campos preenchidos', async () => {
      mockExtractEntries(service, [
        makeRawEntry({
          day: '09', month: '02',
          bnccCode: 'EI01EO03',
          objetivoBNCC: 'Estabelecer vínculos afetivos com adultos.',
          objetivoCurriculo: 'Perceber o ambiente como espaço de cuidado.',
          intencionalidade: 'Favorecer a adaptação e o vínculo afetivo.',
        }),
      ]);

      const result = await service.parsePdf('/fake/path.pdf', 'EI01');

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].objetivoBNCC).toBe('Estabelecer vínculos afetivos com adultos.');
      expect(result.entries[0].objetivoCurriculo).toBe('Perceber o ambiente como espaço de cuidado.');
      expect(result.entries[0].intencionalidade).toBe('Favorecer a adaptação e o vínculo afetivo.');
      expect(result.entries[0].objetivoBNCCCode).toBe('EI01EO03');
    });

    it('deve extrair a data corretamente como Date de 2026', async () => {
      mockExtractEntries(service, [makeRawEntry({ day: '09', month: '02' })]);

      const result = await service.parsePdf('/fake/path.pdf', 'EI01');

      const entry = result.entries[0];
      expect(entry.date).toBeInstanceOf(Date);
      expect(entry.date.getFullYear()).toBe(2026);
      expect(entry.date.getMonth()).toBe(1); // Fevereiro = 1 (0-indexed)
      expect(entry.date.getDate()).toBe(9);
    });

    it('deve usar objetivoBNCC como objetivoCurriculo quando objetivoCurriculo está vazio', async () => {
      mockExtractEntries(service, [
        makeRawEntry({ objetivoCurriculo: '' }),
      ]);

      const result = await service.parsePdf('/fake/path.pdf', 'EI01');

      expect(result.entries[0].objetivoCurriculo).toBe(result.entries[0].objetivoBNCC);
    });

    it('deve definir intencionalidade como undefined quando vazia', async () => {
      mockExtractEntries(service, [
        makeRawEntry({ intencionalidade: '' }),
      ]);

      const result = await service.parsePdf('/fake/path.pdf', 'EI01');

      expect(result.entries[0].intencionalidade).toBeUndefined();
    });
  });

  // ── 2. Segmentação EI01/EI02/EI03 ──────────────────────────────────────────

  describe('segmentação por EI01/EI02/EI03', () => {
    it('deve retornar apenas entradas do segmento EI01 (1 entrada)', async () => {
      mockExtractEntries(service, [
        makeRawEntry({ day: '09', month: '02', bnccCode: 'EI01EO01', objetivoBNCC: 'Objetivo EI01.' }),
      ]);

      const result = await service.parsePdf('/fake/path.pdf', 'EI01');

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].objetivoBNCCCode).toBe('EI01EO01');
    });

    it('deve retornar apenas entradas do segmento EI02 (2 entradas)', async () => {
      mockExtractEntries(service, [
        makeRawEntry({ day: '10', month: '02', bnccCode: 'EI02CG01', objetivoBNCC: 'Objetivo EI02 A.' }),
        makeRawEntry({ day: '11', month: '02', bnccCode: 'EI02CG02', objetivoBNCC: 'Objetivo EI02 B.' }),
      ]);

      const result = await service.parsePdf('/fake/path.pdf', 'EI02');

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].objetivoBNCCCode).toContain('EI02');
    });

    it('deve retornar apenas entradas do segmento EI03 (2 entradas)', async () => {
      mockExtractEntries(service, [
        makeRawEntry({ day: '12', month: '02', bnccCode: 'EI03EO01', objetivoBNCC: 'Objetivo EI03 A.' }),
        makeRawEntry({ day: '13', month: '02', bnccCode: 'EI03EO02', objetivoBNCC: 'Objetivo EI03 B.' }),
      ]);

      const result = await service.parsePdf('/fake/path.pdf', 'EI03');

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].objetivoBNCCCode).toContain('EI03');
    });

    it('deve tratar mesma data em EI01 e EI02 como entradas distintas (não deduplicar entre segmentos)', async () => {
      // EI01: parsePdf retorna entrada EI01 para 09/02
      const ei01Mock = [makeRawEntry({ day: '09', month: '02', bnccCode: 'EI01EO01', objetivoBNCC: 'Objetivo EI01.' })];
      // EI02: parsePdf retorna entrada EI02 para 09/02
      const ei02Mock = [makeRawEntry({ day: '09', month: '02', bnccCode: 'EI02CG01', objetivoBNCC: 'Objetivo EI02.' })];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const extractSpy = jest.spyOn(service as any, 'extractEntriesViaPython');

      extractSpy.mockResolvedValueOnce(ei01Mock);
      const ei01Result = await service.parsePdf('/fake/path.pdf', 'EI01');

      extractSpy.mockResolvedValueOnce(ei02Mock);
      const ei02Result = await service.parsePdf('/fake/path.pdf', 'EI02');

      expect(ei01Result.entries).toHaveLength(1);
      expect(ei02Result.entries).toHaveLength(1);
      expect(ei01Result.entries[0].objetivoBNCC).toContain('EI01');
      expect(ei02Result.entries[0].objetivoBNCC).toContain('EI02');
    });

    it('deve lançar BadRequestException se extractEntriesViaPython retornar lista vazia', async () => {
      mockExtractEntries(service, []);

      await expect(service.parsePdf('/fake/path.pdf', 'EI03')).rejects.toThrow(
        /Nenhuma entrada válida encontrada/,
      );
    });

    it('deve lançar BadRequestException se o arquivo PDF não existir', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.parsePdf('/fake/path.pdf', 'EI01')).rejects.toThrow(
        /Arquivo PDF não encontrado/,
      );
    });
  });

  // ── 3. Normalização de CampoDeExperiencia ───────────────────────────────────

  describe('normalizeCampoDeExperiencia', () => {
    const testCases: Array<{ input: string; expected: CampoDeExperiencia }> = [
      { input: 'O eu, o outro e o nós', expected: CampoDeExperiencia.O_EU_O_OUTRO_E_O_NOS },
      { input: 'Corpo, gestos e movimentos', expected: CampoDeExperiencia.CORPO_GESTOS_E_MOVIMENTOS },
      { input: 'Traços, sons, cores e formas', expected: CampoDeExperiencia.TRACOS_SONS_CORES_E_FORMAS },
      { input: 'Escuta, fala, pensamento e imaginação', expected: CampoDeExperiencia.ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO },
      { input: 'Espaços, tempos, quantidades, relações e transformações', expected: CampoDeExperiencia.ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES },
      // Valores de enum (retornados pelo Python)
      { input: 'O_EU_O_OUTRO_E_O_NOS', expected: CampoDeExperiencia.O_EU_O_OUTRO_E_O_NOS },
      { input: 'CORPO_GESTOS_E_MOVIMENTOS', expected: CampoDeExperiencia.CORPO_GESTOS_E_MOVIMENTOS },
      { input: 'TRACOS_SONS_CORES_E_FORMAS', expected: CampoDeExperiencia.TRACOS_SONS_CORES_E_FORMAS },
      { input: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', expected: CampoDeExperiencia.ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO },
      { input: 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', expected: CampoDeExperiencia.ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`deve normalizar "${input.substring(0, 30)}..." para ${expected}`, () => {
        const result = service.normalizeCampoDeExperiencia(input);
        expect(result).toBe(expected);
      });
    });

    it('deve usar fallback pelo código BNCC quando texto é inválido', () => {
      expect(service.normalizeCampoDeExperiencia('---', 'EI02ET03')).toBe(
        CampoDeExperiencia.ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES,
      );
      expect(service.normalizeCampoDeExperiencia('???', 'EI01CG01')).toBe(
        CampoDeExperiencia.CORPO_GESTOS_E_MOVIMENTOS,
      );
    });
  });

  // ── 4. Múltiplas entradas ────────────────────────────────────────────────────

  describe('múltiplas entradas', () => {
    it('deve extrair 5 entradas de EI02 com datas distintas', async () => {
      const entries = [
        makeRawEntry({ day: '19', month: '02', bnccCode: 'EI02EO01' }),
        makeRawEntry({ day: '20', month: '02', bnccCode: 'EI02EO02' }),
        makeRawEntry({ day: '23', month: '02', bnccCode: 'EI02CG01' }),
        makeRawEntry({ day: '24', month: '02', bnccCode: 'EI02CG02' }),
        makeRawEntry({ day: '25', month: '02', bnccCode: 'EI02TS01' }),
      ];
      mockExtractEntries(service, entries);

      const result = await service.parsePdf('/fake/path.pdf', 'EI02');

      expect(result.entries).toHaveLength(5);
      expect(result.totalExtracted).toBe(5);
      expect(result.errors).toHaveLength(0);
    });

    it('deve reportar erro para data inválida mas continuar processando', async () => {
      const entries = [
        makeRawEntry({ day: '99', month: '13' }), // data inválida
        makeRawEntry({ day: '10', month: '02', bnccCode: 'EI01EO01' }),
      ];
      mockExtractEntries(service, entries);

      const result = await service.parsePdf('/fake/path.pdf', 'EI01');

      expect(result.entries).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Data inválida');
    });
  });

  // ── 5. Campos da intencionalidade ────────────────────────────────────────────

  describe('intencionalidade e campos extras', () => {
    it('deve extrair intencionalidade quando presente', async () => {
      mockExtractEntries(service, [
        makeRawEntry({
          intencionalidade: 'Desenvolver orientação espacial e consciência corporal.',
        }),
      ]);

      const result = await service.parsePdf('/fake/path.pdf', 'EI01');

      expect(result.entries[0].intencionalidade).toBe(
        'Desenvolver orientação espacial e consciência corporal.',
      );
    });

    it('deve retornar intencionalidade undefined quando vazia', async () => {
      mockExtractEntries(service, [makeRawEntry({ intencionalidade: '' })]);

      const result = await service.parsePdf('/fake/path.pdf', 'EI01');

      expect(result.entries[0].intencionalidade).toBeUndefined();
    });

    it('deve extrair bimestre e semana corretamente', async () => {
      mockExtractEntries(service, [
        makeRawEntry({ bimester: 2, week: 8 }),
      ]);

      const result = await service.parsePdf('/fake/path.pdf', 'EI01');

      expect(result.entries[0].bimester).toBe(2);
      expect(result.entries[0].weekOfYear).toBe(8);
    });
  });
});
