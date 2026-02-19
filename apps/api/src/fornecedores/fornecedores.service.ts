import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFornecedorDto } from './dto/create-fornecedor.dto';
import { UpdateFornecedorDto } from './dto/update-fornecedor.dto';

@Injectable()
export class FornecedoresService {
  constructor(private prisma: PrismaService) {}

  /**
   * Criar novo fornecedor
   */
  async create(createFornecedorDto: CreateFornecedorDto, user: any) {
    const fornecedor = await this.prisma.fornecedor.create({
      data: {
        ...createFornecedorDto,
        mantenedoraId: user.mantenedoraId,
      },
    });

    return fornecedor;
  }

  /**
   * Listar fornecedores
   */
  async findAll(search: string, user: any) {
    const where: any = {
      mantenedoraId: user.mantenedoraId,
    };

    if (search) {
      where.OR = [
        { razaoSocial: { contains: search, mode: 'insensitive' } },
        { nomeFantasia: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search } },
      ];
    }

    const fornecedores = await this.prisma.fornecedor.findMany({
      where,
      orderBy: { razaoSocial: 'asc' },
    });

    return fornecedores;
  }

  /**
   * Buscar fornecedor por ID
   */
  async findOne(id: string, user: any) {
    const fornecedor = await this.prisma.fornecedor.findUnique({
      where: { id },
    });

    if (!fornecedor) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    if (fornecedor.mantenedoraId !== user.mantenedoraId) {
      throw new ForbiddenException('Você não tem acesso a este fornecedor');
    }

    return fornecedor;
  }

  /**
   * Atualizar fornecedor
   */
  async update(id: string, updateFornecedorDto: UpdateFornecedorDto, user: any) {
    await this.findOne(id, user);

    const updated = await this.prisma.fornecedor.update({
      where: { id },
      data: updateFornecedorDto,
    });

    return updated;
  }

  /**
   * Deletar fornecedor
   */
  async remove(id: string, user: any) {
    await this.findOne(id, user);

    await this.prisma.fornecedor.delete({
      where: { id },
    });

    return { message: 'Fornecedor removido com sucesso' };
  }

  /**
   * Listar pedidos de compra do fornecedor
   */
  async getPedidos(id: string, user: any) {
    await this.findOne(id, user);

    const pedidos = await this.prisma.pedidoCompra.findMany({
      where: { fornecedorId: id },
      include: {
        itens: true,
      },
      orderBy: { criadoEm: 'desc' },
    });

    return pedidos;
  }
}
