import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Listar todos os materiais ativos
   */
  async findAll(_category?: string) {
    return this.prisma.stockItem.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Buscar material por ID
   */
  async findOne(id: string) {
    return this.prisma.stockItem.findUnique({
      where: { id },
    });
  }

  /**
   * Buscar materiais por categoria
   */
  async findByCategory(category: string) {
    // StockItem não tem campo category — filtra por name contains
    return this.prisma.stockItem.findMany({
      where: { name: { contains: category, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Buscar materiais pedagógicos
   */
  async findPedagogicos() {
    return this.findByCategory('PEDAGOGICO');
  }

  /**
   * Buscar materiais de higiene
   */
  async findHigiene() {
    return this.findByCategory('HIGIENE');
  }

  /**
   * Catálogo de preços de referência para pedidos de compra.
   * Usa o modelo Material (com referencePrice, category, unit).
   * Aceita category: PEDAGOGICO | HIGIENE | HIGIENE_PESSOAL_CRIANCAS
   */
  async getCatalog(category?: string) {
    // Normaliza alias HIGIENE_PESSOAL_CRIANCAS → HIGIENE
    const cat = category === 'HIGIENE_PESSOAL_CRIANCAS' ? 'HIGIENE' : category;
    const where: Record<string, unknown> = { isActive: true };
    if (cat) {
      where.category = cat;
    } else {
      // Sem filtro: retorna apenas PEDAGOGICO e HIGIENE (escopo da coordenadora)
      where.category = { in: ['PEDAGOGICO', 'HIGIENE'] };
    }
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
