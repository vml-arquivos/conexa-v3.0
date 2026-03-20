import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';

/**
 * Determina se o usuário tem escopo central (acessa toda a rede da mantenedora).
 */
function isCentralRole(user: JwtPayload): boolean {
  return user.roles.some(
    (r) =>
      r.level === RoleLevel.DEVELOPER ||
      r.level === RoleLevel.MANTENEDORA ||
      r.level === RoleLevel.STAFF_CENTRAL,
  );
}

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Listar todos os StockItems da unidade do usuário.
   * AUDITORIA MULTI-TENANT: filtra por unitId (UNIDADE) ou mantenedora via join (CENTRAL).
   */
  async findAll(user: JwtPayload, _category?: string) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    if (isCentralRole(user)) {
      // Acesso central: todos os StockItems das unidades da mantenedora
      return this.prisma.stockItem.findMany({
        where: {
          unit: { mantenedoraId: user.mantenedoraId },
        },
        orderBy: { name: 'asc' },
      });
    }
    // Acesso de unidade: apenas os itens da própria unidade
    if (!user.unitId) throw new ForbiddenException('Escopo de unidade ausente');
    return this.prisma.stockItem.findMany({
      where: { unitId: user.unitId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Buscar StockItem por ID com validação de escopo multi-tenant.
   */
  async findOne(id: string, user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const item = await this.prisma.stockItem.findUnique({
      where: { id },
      include: { unit: { select: { mantenedoraId: true } } },
    });
    if (!item) return null;
    // Validar que o item pertence à mantenedora do usuário
    if (item.unit?.mantenedoraId !== user.mantenedoraId) {
      throw new ForbiddenException('Sem acesso a este item');
    }
    // Validar escopo de unidade
    if (!isCentralRole(user) && user.unitId && item.unitId !== user.unitId) {
      throw new ForbiddenException('Sem acesso a este item');
    }
    return item;
  }

  /**
   * Buscar StockItems por categoria (filtra por name) com isolamento multi-tenant.
   */
  async findByCategory(category: string, user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const nameFilter = { name: { contains: category, mode: 'insensitive' as const } };
    if (isCentralRole(user)) {
      return this.prisma.stockItem.findMany({
        where: {
          ...nameFilter,
          unit: { mantenedoraId: user.mantenedoraId },
        },
        orderBy: { name: 'asc' },
      });
    }
    if (!user.unitId) throw new ForbiddenException('Escopo de unidade ausente');
    return this.prisma.stockItem.findMany({
      where: { ...nameFilter, unitId: user.unitId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Buscar materiais pedagógicos com isolamento multi-tenant.
   */
  async findPedagogicos(user: JwtPayload) {
    return this.findByCategory('PEDAGOGICO', user);
  }

  /**
   * Buscar materiais de higiene com isolamento multi-tenant.
   */
  async findHigiene(user: JwtPayload) {
    return this.findByCategory('HIGIENE', user);
  }

  /**
   * Catálogo de preços de referência para pedidos de compra.
   * Usa o modelo Material (com referencePrice, category, unit).
   * AUDITORIA MULTI-TENANT: filtra por mantenedoraId.
   * Aceita category: PEDAGOGICO | HIGIENE | HIGIENE_PESSOAL_CRIANCAS | ADMINISTRATIVO
   */
  async getCatalog(user: JwtPayload, category?: string) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    // Normaliza alias HIGIENE_PESSOAL_CRIANCAS → HIGIENE
    const cat = category === 'HIGIENE_PESSOAL_CRIANCAS' ? 'HIGIENE' : category;
    const where: Record<string, unknown> = {
      isActive: true,
      mantenedoraId: user.mantenedoraId,
    };
    if (cat) {
      where.category = cat;
    }
    // Sem filtro de categoria: retorna todos os itens ativos da mantenedora
    return this.prisma.material.findMany({
      where: where as any,
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        unit: true,
        referencePrice: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }
}
