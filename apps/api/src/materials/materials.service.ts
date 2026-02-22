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
}
