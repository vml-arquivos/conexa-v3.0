import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Listar todos os materiais ativos
   */
  async findAll(category?: string) {
    return this.prisma.material.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Buscar material por ID
   */
  async findOne(id: string) {
    return this.prisma.material.findUnique({
      where: { id },
    });
  }

  /**
   * Buscar materiais por categoria
   */
  async findByCategory(category: string) {
    return this.prisma.material.findMany({
      where: {
        category,
        isActive: true,
      },
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
