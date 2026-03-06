import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

// ─── Tipos internos ───────────────────────────────────────────────────────────

export interface CatalogItemMeta {
  category?: string;
  unit?: string;
  price?: number | null;
  supplier?: string | null;
}

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  price: number | null;
  supplier: string | null;
  isActive: boolean;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseMeta(description?: string | null): CatalogItemMeta {
  if (!description) return {};
  try {
    return JSON.parse(description) as CatalogItemMeta;
  } catch {
    return {};
  }
}

function isCentralRole(user: JwtPayload): boolean {
  return (
    Array.isArray(user.roles) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user.roles.some((r: any) =>
      r?.level === RoleLevel.STAFF_CENTRAL ||
      r?.level === RoleLevel.MANTENEDORA ||
      r?.level === RoleLevel.DEVELOPER,
    )
  );
}

function isUnidadeRole(user: JwtPayload): boolean {
  return (
    Array.isArray(user.roles) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user.roles.some((r: any) => r?.level === RoleLevel.UNIDADE)
  );
}

// Normaliza headers do CSV/XLSX para campos esperados
const HEADER_MAP: Record<string, string> = {
  // code
  code: 'code', codigo: 'code', cod: 'code', 'cód': 'code', 'código': 'code',
  // name
  name: 'name', nome: 'name', produto: 'name', descricao: 'name', 'descrição': 'name', item: 'name',
  // category
  category: 'category', categoria: 'category', tipo: 'category',
  // unit
  unit: 'unit', unidade: 'unit', unid: 'unit', 'un.': 'unit', medida: 'unit',
  // price
  price: 'price', preco: 'price', 'preço': 'price', 'preço unit.': 'price',
  'preco unit': 'price', 'preco unitario': 'price', 'preço unitário': 'price', valor: 'price',
  // supplier
  supplier: 'supplier', fornecedor: 'supplier', marca: 'supplier',
};

function normalizeHeader(h: string): string {
  const clean = h.trim().toLowerCase().replace(/[^\w\sáéíóúãõâêîôûàèìòùç.]/g, '');
  return HEADER_MAP[clean] ?? clean;
}

function parsePrice(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).replace(/[R$\s]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /catalog/items
   * Retorna itens do catálogo (StockItem) com metadados parseados do campo description.
   * UNIDADE: apenas sua unidade. CENTRAL: pode filtrar por unitId ou ver tudo.
   */
  async getItems(
    user: JwtPayload,
    params: { unitId?: string; category?: string },
  ): Promise<CatalogItem[]> {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');

    let filterUnitId: string | undefined;
    if (isUnidadeRole(user)) {
      if (!user.unitId) throw new ForbiddenException('Escopo inválido');
      filterUnitId = user.unitId;
    } else if (isCentralRole(user)) {
      filterUnitId = params.unitId; // pode ser undefined → sem filtro de unidade
    } else {
      throw new ForbiddenException('Acesso negado');
    }

    const where: Record<string, unknown> = { isActive: true };
    if (filterUnitId) where.unitId = filterUnitId;

    const items = await this.prisma.stockItem.findMany({
      where: where as any,
      orderBy: { name: 'asc' },
      take: 2000,
    });

    return items
      .map(item => {
        const meta = parseMeta(item.description);
        return {
          id: item.id,
          code: item.code,
          name: item.name,
          category: meta.category ?? 'OUTRO',
          unit: meta.unit ?? 'un',
          price: meta.price ?? null,
          supplier: meta.supplier ?? null,
          isActive: item.isActive,
        };
      })
      .filter(item => {
        if (!params.category) return true;
        return item.category.toUpperCase() === params.category.toUpperCase();
      });
  }

  /**
   * POST /catalog/import
   * Importa CSV ou XLSX e faz upsert em StockItem por (unitId, code).
   * Armazena metadados (category, unit, price, supplier) como JSON em description.
   */
  async importCatalog(
    user: JwtPayload,
    file: Express.Multer.File,
    targetUnitId?: string,
  ): Promise<ImportResult> {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');

    // Determinar unitId alvo
    let unitId: string;
    if (isUnidadeRole(user)) {
      if (!user.unitId) throw new ForbiddenException('Escopo inválido');
      unitId = user.unitId;
    } else if (isCentralRole(user)) {
      if (!targetUnitId) throw new BadRequestException('unitId é obrigatório para MANTENEDORA/STAFF_CENTRAL');
      unitId = targetUnitId;
    } else {
      throw new ForbiddenException('Acesso negado');
    }

    // Verificar se a unidade existe
    const unit = await this.prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) throw new BadRequestException(`Unidade ${unitId} não encontrada`);

    // Parse do arquivo
    const rows = await this.parseFile(file);
    if (rows.length === 0) throw new BadRequestException('Arquivo vazio ou sem dados válidos');

    const result: ImportResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      const code = String(row.code ?? '').trim();
      const name = String(row.name ?? '').trim();

      if (!code || !name) {
        result.skipped++;
        continue;
      }

      const meta: CatalogItemMeta = {
        category: String(row.category ?? 'OUTRO').trim().toUpperCase(),
        unit: String(row.unit ?? 'un').trim(),
        price: parsePrice(row.price),
        supplier: row.supplier ? String(row.supplier).trim() : null,
      };
      const description = JSON.stringify(meta);

      try {
        const existing = await this.prisma.stockItem.findUnique({
          where: { unitId_code: { unitId, code } },
        });

        if (existing) {
          await this.prisma.stockItem.update({
            where: { id: existing.id },
            data: { name, description, isActive: true },
          });
          result.updated++;
        } else {
          await this.prisma.stockItem.create({
            data: { unitId, code, name, description, isActive: true },
          });
          result.inserted++;
        }
      } catch (e) {
        result.errors.push(`Linha code=${code}: ${(e as Error).message}`);
      }
    }

    return result;
  }

  // ── Parse CSV ──────────────────────────────────────────────────────────────

  private parseCSV(buffer: Buffer): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      const rows: Record<string, unknown>[] = [];
      const stream = Readable.from(buffer);
      stream
        .pipe(
          csvParser({
            mapHeaders: ({ header }) => normalizeHeader(header),
            separator: undefined, // auto-detect
          }),
        )
        .on('data', (row: Record<string, unknown>) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', reject);
    });
  }

  // ── Parse XLSX ─────────────────────────────────────────────────────────────

  private parseXLSX(buffer: Buffer): Record<string, unknown>[] {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx') as typeof import('xlsx');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    return raw.map(row => {
      const normalized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        normalized[normalizeHeader(k)] = v;
      }
      return normalized;
    });
  }

  // ── Dispatcher ─────────────────────────────────────────────────────────────

  private async parseFile(file: Express.Multer.File): Promise<Record<string, unknown>[]> {
    const mime = file.mimetype.toLowerCase();
    const name = file.originalname.toLowerCase();

    if (
      mime.includes('csv') ||
      mime.includes('text/plain') ||
      name.endsWith('.csv')
    ) {
      return this.parseCSV(file.buffer);
    }

    if (
      mime.includes('spreadsheet') ||
      mime.includes('excel') ||
      mime.includes('openxmlformats') ||
      name.endsWith('.xlsx') ||
      name.endsWith('.xls')
    ) {
      return this.parseXLSX(file.buffer);
    }

    throw new BadRequestException(
      `Formato não suportado: ${file.mimetype}. Use CSV ou XLSX.`,
    );
  }
}
