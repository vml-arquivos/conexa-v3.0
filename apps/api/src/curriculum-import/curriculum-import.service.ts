import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatrixCacheInvalidationService } from '../cache/matrix-cache-invalidation.service';
import { AuditService } from '../common/services/audit.service';
import {
  CurriculumPdfParserService,
  ParsedMatrixEntry,
  MatrixSegment,
} from './curriculum-pdf-parser.service';
import { ImportCurriculumDto, ImportMatrixDto, ImportMode } from './dto/import-curriculum.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel, AuditLogAction, AuditLogEntity } from '@prisma/client';
import { getPedagogicalDay } from '../common/utils/date.utils';

/**
 * Resultado da importação
 */
export interface ImportResult {
  mode: ImportMode;
  matrixId?: string;
  totalExtracted: number;
  totalInserted: number;
  totalUpdated: number;
  totalUnchanged: number;
  preview?: any[];
  errors: string[];
}

@Injectable()
export class CurriculumImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly pdfParser: CurriculumPdfParserService,
    private readonly matrixCacheInvalidation: MatrixCacheInvalidationService,
  ) {}

  /**
   * Importação em modo dry-run (simulação)
   */
  async importDryRun(dto: ImportCurriculumDto, user: JwtPayload): Promise<ImportResult> {
    this.validatePermission(user);

    const segment = (dto.segment as MatrixSegment) || 'EI01';
    const parserResult = await this.pdfParser.parsePdf(dto.sourceUrl, segment);

    const result = await this.simulateUpsert(
      dto.mantenedoraId,
      dto.year,
      dto.segment,
      dto.version,
      parserResult.entries,
    );

    return {
      mode: ImportMode.DRY_RUN,
      totalExtracted: parserResult.totalExtracted,
      totalInserted: result.inserts,
      totalUpdated: result.updates,
      totalUnchanged: result.unchanged,
      preview: result.preview,
      errors: parserResult.errors,
    };
  }

  /**
   * Importação real (apply)
   */
  async importApply(matrixId: string, dto: ImportMatrixDto, user: JwtPayload): Promise<ImportResult> {
    this.validatePermission(user);

    const matrix = await this.prisma.curriculumMatrix.findUnique({
      where: { id: matrixId },
    });

    if (!matrix) {
      throw new NotFoundException('Matriz curricular não encontrada');
    }

    if (
      matrix.mantenedoraId !== user.mantenedoraId &&
      user.roles.every((r) => r.level !== RoleLevel.DEVELOPER)
    ) {
      throw new ForbiddenException('Você não tem permissão para importar esta matriz');
    }

    const segment = (matrix.segment as MatrixSegment) || 'EI01';
    const parserResult = await this.pdfParser.parsePdf(dto.sourceUrl, segment);

    const result = await this.applyUpsert(matrix, parserResult.entries, dto.force || false, user);

    await this.auditService.log({
      action: AuditLogAction.IMPORT,
      entity: AuditLogEntity.CURRICULUM_MATRIX,
      entityId: matrixId,
      userId: user.sub,
      mantenedoraId: matrix.mantenedoraId,
      unitId: undefined,
      changes: {
        totalExtracted: parserResult.totalExtracted,
        totalInserted: result.inserts,
        totalUpdated: result.updates,
        totalUnchanged: result.unchanged,
        sourceUrl: dto.sourceUrl,
        force: dto.force,
      },
    });

    await this.matrixCacheInvalidation.bump(matrix.mantenedoraId);

    return {
      mode: ImportMode.APPLY,
      matrixId,
      totalExtracted: parserResult.totalExtracted,
      totalInserted: result.inserts,
      totalUpdated: result.updates,
      totalUnchanged: result.unchanged,
      errors: parserResult.errors,
    };
  }

  /**
   * Simula upsert para dry-run
   */
  private async simulateUpsert(
    mantenedoraId: string,
    year: number,
    segment: string,
    version: number,
    entries: ParsedMatrixEntry[],
  ): Promise<{ inserts: number; updates: number; unchanged: number; preview: any[] }> {
    const existingMatrix = await this.prisma.curriculumMatrix.findFirst({
      where: { mantenedoraId, year, segment, version },
    });

    let inserts = 0;
    let updates = 0;
    let unchanged = 0;
    const preview: any[] = [];

    for (const entry of entries.slice(0, 5)) {
      const pedagogicalDay = getPedagogicalDay(entry.date);
      const existing = existingMatrix
        ? await this.findEntryByPedagogicalDay(existingMatrix.id, entry.date)
        : null;

      if (existing) {
        if (this.hasChanges(existing, entry)) {
          updates++;
          preview.push({ action: 'UPDATE', date: pedagogicalDay, entry });
        } else {
          unchanged++;
        }
      } else {
        inserts++;
        preview.push({ action: 'INSERT', date: pedagogicalDay, entry });
      }
    }

    for (const entry of entries.slice(5)) {
      const existing = existingMatrix
        ? await this.findEntryByPedagogicalDay(existingMatrix.id, entry.date)
        : null;

      if (existing) {
        if (this.hasChanges(existing, entry)) updates++;
        else unchanged++;
      } else {
        inserts++;
      }
    }

    return { inserts, updates, unchanged, preview };
  }

  /**
   * Aplica upsert real com match por range de dia pedagógico.
   *
   * Correção crítica: em vez de findUnique(matrixId_date) com DateTime exato,
   * usa findFirst com range do dia pedagógico (00:00 a 23:59 no fuso -03:00).
   * Isso evita duplicatas por drift de timezone.
   *
   * Proteção de integridade histórica:
   * - Se a entry tem DiaryEvent vinculado, NÃO altera campos normativos
   *   (objetivoBNCC, objetivoCurriculo, campoDeExperiencia, date).
   * - Atualiza apenas intencionalidade/exemploAtividade se vierem preenchidos.
   *
   * Inserção canônica: grava date como T12:00:00-03:00 para minimizar drift.
   */
  private async applyUpsert(
    matrix: any,
    entries: ParsedMatrixEntry[],
    force: boolean,
    user: JwtPayload,
  ): Promise<{ inserts: number; updates: number; unchanged: number }> {
    let inserts = 0;
    let updates = 0;
    let unchanged = 0;

    for (const entry of entries) {
      try {
        const existing = await this.findEntryByPedagogicalDay(matrix.id, entry.date);

        if (existing) {
          // Verificar se há DiaryEvent vinculado (integridade histórica)
          const hasLinkedEvents = await this.prisma.diaryEvent.count({
            where: { curriculumEntryId: existing.id },
          });

          if (hasLinkedEvents > 0 && !force) {
            // Só atualiza campos não-normativos se vierem preenchidos E forem diferentes
            const nonNormativeUpdate: any = {};
            if (
              entry.intencionalidade &&
              entry.intencionalidade.length > 5 &&
              this.normalize(existing.intencionalidade) !== this.normalize(entry.intencionalidade)
            ) {
              nonNormativeUpdate.intencionalidade = entry.intencionalidade;
            }
            if (
              entry.exemploAtividade &&
              entry.exemploAtividade.length > 5 &&
              this.normalize(existing.exemploAtividade) !== this.normalize(entry.exemploAtividade)
            ) {
              nonNormativeUpdate.exemploAtividade = entry.exemploAtividade;
            }

            if (Object.keys(nonNormativeUpdate).length > 0) {
              await this.prisma.curriculumMatrixEntry.update({
                where: { id: existing.id },
                data: nonNormativeUpdate,
              });
              updates++;
            } else {
              unchanged++;
            }
            continue;
          }

          // Sem eventos vinculados (ou force=true): verificar se há mudanças
          if (!this.hasChanges(existing, entry) && !force) {
            unchanged++;
            continue;
          }

          if (force) {
            // Force: atualiza tudo
            await this.prisma.curriculumMatrixEntry.update({
              where: { id: existing.id },
              data: {
                weekOfYear: entry.weekOfYear,
                dayOfWeek: entry.dayOfWeek,
                bimester: entry.bimester,
                campoDeExperiencia: entry.campoDeExperiencia,
                objetivoBNCC: entry.objetivoBNCC,
                objetivoBNCCCode: entry.objetivoBNCCCode,
                objetivoCurriculo: entry.objetivoCurriculo,
                ...(entry.intencionalidade ? { intencionalidade: entry.intencionalidade } : {}),
                ...(entry.exemploAtividade ? { exemploAtividade: entry.exemploAtividade } : {}),
              },
            });
            updates++;
          } else {
            // Sem force: atualiza campos que mudaram
            const updateData: any = {};
            if (entry.intencionalidade) updateData.intencionalidade = entry.intencionalidade;
            if (entry.exemploAtividade) updateData.exemploAtividade = entry.exemploAtividade;

            const normativeChanged =
              this.normalize(existing.objetivoBNCC) !== this.normalize(entry.objetivoBNCC) ||
              this.normalize(existing.objetivoCurriculo) !== this.normalize(entry.objetivoCurriculo) ||
              existing.campoDeExperiencia !== entry.campoDeExperiencia;

            if (normativeChanged) {
              updateData.campoDeExperiencia = entry.campoDeExperiencia;
              updateData.objetivoBNCC = entry.objetivoBNCC;
              updateData.objetivoBNCCCode = entry.objetivoBNCCCode;
              updateData.objetivoCurriculo = entry.objetivoCurriculo;
              updateData.weekOfYear = entry.weekOfYear;
              updateData.dayOfWeek = entry.dayOfWeek;
              updateData.bimester = entry.bimester;
            }

            if (Object.keys(updateData).length > 0) {
              await this.prisma.curriculumMatrixEntry.update({
                where: { id: existing.id },
                data: updateData,
              });
              updates++;
            } else {
              unchanged++;
            }
          }
        } else {
          // Não existe: inserir com data canônica (T12:00:00-03:00)
          const ymd = getPedagogicalDay(entry.date);
          const canonicalDate = new Date(`${ymd}T12:00:00-03:00`);

          await this.prisma.curriculumMatrixEntry.create({
            data: {
              matrixId: matrix.id,
              date: canonicalDate,
              weekOfYear: entry.weekOfYear,
              dayOfWeek: entry.dayOfWeek,
              bimester: entry.bimester,
              campoDeExperiencia: entry.campoDeExperiencia,
              objetivoBNCC: entry.objetivoBNCC,
              objetivoBNCCCode: entry.objetivoBNCCCode,
              objetivoCurriculo: entry.objetivoCurriculo,
              intencionalidade: entry.intencionalidade,
              exemploAtividade: entry.exemploAtividade,
            },
          });
          inserts++;
        }
      } catch (error) {
        // Ignorar erros de unique constraint (já existe com data exata)
        unchanged++;
      }
    }

    return { inserts, updates, unchanged };
  }

  /**
   * Busca uma entry pelo dia pedagógico (range 00:00 a 23:59 no fuso -03:00).
   * Evita duplicatas por drift de timezone.
   */
  private async findEntryByPedagogicalDay(
    matrixId: string,
    date: Date,
  ) {
    const ymd = getPedagogicalDay(date);
    const start = new Date(`${ymd}T00:00:00-03:00`);
    const end = new Date(`${ymd}T23:59:59-03:00`);

    return this.prisma.curriculumMatrixEntry.findFirst({
      where: {
        matrixId,
        date: { gte: start, lte: end },
      },
    });
  }

  /**
   * Normaliza string para comparação
   */
  private normalize(str: string | null | undefined): string {
    if (!str) return '';
    return str.trim().replace(/\s+/g, ' ');
  }

  /**
   * Verifica se há mudanças entre entrada existente e nova.
   * Não considera null/undefined como mudança (proteção contra sobrescrita).
   */
  private hasChanges(existing: any, entry: ParsedMatrixEntry): boolean {
    const normativeChanged =
      this.normalize(existing.objetivoBNCC) !== this.normalize(entry.objetivoBNCC) ||
      this.normalize(existing.objetivoCurriculo) !== this.normalize(entry.objetivoCurriculo) ||
      existing.campoDeExperiencia !== entry.campoDeExperiencia;

    const nonNormativeChanged =
      (entry.intencionalidade &&
        this.normalize(existing.intencionalidade) !== this.normalize(entry.intencionalidade)) ||
      (entry.exemploAtividade &&
        this.normalize(existing.exemploAtividade) !== this.normalize(entry.exemploAtividade));

    return normativeChanged || !!nonNormativeChanged;
  }

  /**
   * Valida permissão de importação
   */
  private validatePermission(user: JwtPayload): void {
    const hasPermission = user.roles.some(
      (role) =>
        role.level === RoleLevel.DEVELOPER ||
        role.level === RoleLevel.MANTENEDORA ||
        role.level === RoleLevel.STAFF_CENTRAL,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Apenas Mantenedora e Staff Central podem importar matrizes curriculares',
      );
    }
  }
}

  // ─── Tarefa 3.3 — Importação via CSV ────────────────────────────────────────

  /**
   * Importa uma matriz curricular a partir de um CSV em memória (Buffer).
   *
   * Colunas esperadas (case-insensitive, separador vírgula):
   *   data (YYYY-MM-DD), campo_experiencia, objetivo_bncc, codigo_bncc,
   *   objetivo_curriculo, intencionalidade (opcional), exemplo_atividade (opcional)
   *
   * Cria a CurriculumMatrix se não existir, depois faz upsert das entries.
   * Retorna relatório: { importados, erros, matrixId }
   */
  async importCsv(
    csvBuffer: Buffer,
    params: {
      mantenedoraId: string;
      name: string;
      year: number;
      segment: string;
      version: number;
    },
    user: JwtPayload,
  ): Promise<{ matrixId: string; importados: number; erros: string[] }> {
    this.validatePermission(user);

    const { mantenedoraId, name, year, segment, version } = params;

    // Parse CSV em memória
    const text = csvBuffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      throw new BadRequestException('CSV vazio ou sem linhas de dados');
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, ''));

    // Validar colunas obrigatórias
    const obrigatorias = ['data', 'campo_experiencia', 'objetivo_bncc', 'objetivo_curriculo'];
    const faltando = obrigatorias.filter((c) => !headers.includes(c));
    if (faltando.length > 0) {
      throw new BadRequestException(
        `Colunas obrigatórias ausentes no CSV: ${faltando.join(', ')}`,
      );
    }

    // Mapeamento de campo_experiencia string → enum
    const CAMPO_MAP: Record<string, string> = {
      'o eu o outro e o nos': 'O_EU_O_OUTRO_E_O_NOS',
      'corpo gestos e movimentos': 'CORPO_GESTOS_E_MOVIMENTOS',
      'tracos sons cores e formas': 'TRACOS_SONS_CORES_E_FORMAS',
      'escuta fala pensamento e imaginacao': 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',
      'espacos tempos quantidades relacoes e transformacoes':
        'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',
      // Abreviações comuns
      'eu outro nos': 'O_EU_O_OUTRO_E_O_NOS',
      'corpo gestos': 'CORPO_GESTOS_E_MOVIMENTOS',
      'tracos sons': 'TRACOS_SONS_CORES_E_FORMAS',
      'escuta fala': 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',
      'espacos tempos': 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',
    };

    function normalizarCampo(raw: string): string | null {
      const key = raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z ]/g, '')
        .trim();
      // Tentar match exato
      if (CAMPO_MAP[key]) return CAMPO_MAP[key];
      // Tentar match parcial
      for (const [k, v] of Object.entries(CAMPO_MAP)) {
        if (key.includes(k) || k.includes(key)) return v;
      }
      // Tentar enum direto
      const enumValues = [
        'O_EU_O_OUTRO_E_O_NOS',
        'CORPO_GESTOS_E_MOVIMENTOS',
        'TRACOS_SONS_CORES_E_FORMAS',
        'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',
        'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',
      ];
      const upper = raw.toUpperCase().replace(/[^A-Z_]/g, '');
      if (enumValues.includes(upper)) return upper;
      return null;
    }

    // Criar ou localizar a CurriculumMatrix
    let matrix = await this.prisma.curriculumMatrix.findFirst({
      where: { mantenedoraId, year, segment, version },
    });

    if (!matrix) {
      matrix = await this.prisma.curriculumMatrix.create({
        data: {
          mantenedoraId,
          name,
          year,
          segment,
          version,
          isActive: true,
          createdBy: user.sub,
        },
      });
    }

    let importados = 0;
    const erros: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = cols[idx] ?? ''; });

      const dataStr = row['data'];
      const campoRaw = row['campo_experiencia'];
      const objetivoBNCC = row['objetivo_bncc'];
      const objetivoCurriculo = row['objetivo_curriculo'];

      if (!dataStr || !campoRaw || !objetivoBNCC || !objetivoCurriculo) {
        erros.push(`Linha ${i + 1}: campos obrigatórios ausentes`);
        continue;
      }

      // Validar data
      const dateObj = new Date(`${dataStr}T12:00:00-03:00`);
      if (isNaN(dateObj.getTime())) {
        erros.push(`Linha ${i + 1}: data inválida "${dataStr}"`);
        continue;
      }

      // Mapear campo de experiência
      const campoEnum = normalizarCampo(campoRaw);
      if (!campoEnum) {
        erros.push(`Linha ${i + 1}: campo_experiencia não reconhecido "${campoRaw}"`);
        continue;
      }

      // Calcular weekOfYear e dayOfWeek
      const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
      const weekOfYear = Math.ceil(
        ((dateObj.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
      );
      const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay();

      try {
        const existing = await this.prisma.curriculumMatrixEntry.findFirst({
          where: {
            matrixId: matrix.id,
            date: { gte: new Date(`${dataStr}T00:00:00-03:00`), lte: new Date(`${dataStr}T23:59:59-03:00`) },
          },
        });

        if (existing) {
          await this.prisma.curriculumMatrixEntry.update({
            where: { id: existing.id },
            data: {
              campoDeExperiencia: campoEnum as any,
              objetivoBNCC,
              objetivoBNCCCode: row['codigo_bncc'] || null,
              objetivoCurriculo,
              intencionalidade: row['intencionalidade'] || null,
              exemploAtividade: row['exemplo_atividade'] || null,
            },
          });
        } else {
          await this.prisma.curriculumMatrixEntry.create({
            data: {
              matrixId: matrix.id,
              date: dateObj,
              weekOfYear,
              dayOfWeek,
              campoDeExperiencia: campoEnum as any,
              objetivoBNCC,
              objetivoBNCCCode: row['codigo_bncc'] || null,
              objetivoCurriculo,
              intencionalidade: row['intencionalidade'] || null,
              exemploAtividade: row['exemplo_atividade'] || null,
            },
          });
        }
        importados++;
      } catch (err: any) {
        erros.push(`Linha ${i + 1}: ${err?.message ?? 'erro desconhecido'}`);
      }
    }

    // Invalidar cache
    await this.matrixCacheInvalidation.bump(mantenedoraId);

    return { matrixId: matrix.id, importados, erros };
  }
