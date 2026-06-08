import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpresaTransporteDto, UpdateEmpresaTransporteDto } from './empresas-transporte.dto';

@Injectable()
export class EmpresasTransporteService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: JwtPayload, unitId?: string) {
    const scopedUnitId = this.resolveUnitScope(user, unitId, false);
    return this.prisma.empresaTransporte.findMany({
      where: {
        mantenedoraId: user.mantenedoraId,
        isActive: true,
        ...(scopedUnitId ? { OR: [{ unitId: scopedUnitId }, { unitId: null }] } : {}),
      },
      orderBy: [{ nome: 'asc' }],
    });
  }

  async create(user: JwtPayload, dto: CreateEmpresaTransporteDto) {
    const unitId = this.resolveUnitScope(user, dto.unitId, false);
    await this.assertUnique(user.mantenedoraId, dto.nome, unitId);
    return this.prisma.empresaTransporte.create({
      data: {
        mantenedoraId: user.mantenedoraId,
        unitId,
        nome: dto.nome.trim(),
        telefone: dto.telefone?.trim() || null,
        observacoes: dto.observacoes?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
  }

  async update(user: JwtPayload, id: string, dto: UpdateEmpresaTransporteDto) {
    const atual = await this.prisma.empresaTransporte.findFirst({
      where: { id, mantenedoraId: user.mantenedoraId },
    });
    if (!atual) throw new NotFoundException('Empresa de transporte não encontrada.');

    const unitId = dto.unitId !== undefined
      ? this.resolveUnitScope(user, dto.unitId || undefined, false)
      : atual.unitId;
    const nome = dto.nome?.trim() ?? atual.nome;
    if (nome !== atual.nome || unitId !== atual.unitId) {
      await this.assertUnique(user.mantenedoraId, nome, unitId, id);
    }

    return this.prisma.empresaTransporte.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined ? { nome } : {}),
        ...(dto.telefone !== undefined ? { telefone: dto.telefone?.trim() || null } : {}),
        ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes?.trim() || null } : {}),
        ...(dto.unitId !== undefined ? { unitId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
    });
  }

  async remove(user: JwtPayload, id: string) {
    const atual = await this.prisma.empresaTransporte.findFirst({
      where: { id, mantenedoraId: user.mantenedoraId },
    });
    if (!atual) throw new NotFoundException('Empresa de transporte não encontrada.');
    return this.prisma.empresaTransporte.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
    });
  }

  private resolveUnitScope(user: JwtPayload, requestedUnitId?: string, required = false): string | null {
    const role = user.roles?.[0];
    const scopes = role?.unitScopes ?? [];
    const selected = requestedUnitId ?? user.unitId;

    if (!selected) {
      if (required) throw new BadRequestException('Unidade obrigatória.');
      return null;
    }

    const canAccessAll = role?.level === 'DEVELOPER' || role?.level === 'MANTENEDORA' || role?.level === 'STAFF_CENTRAL';
    if (!canAccessAll && user.unitId && selected !== user.unitId && !scopes.includes(selected)) {
      throw new BadRequestException('Unidade fora do escopo do usuário.');
    }
    return selected;
  }

  private async assertUnique(mantenedoraId: string, nome: string, unitId: string | null, ignoreId?: string) {
    const existing = await this.prisma.empresaTransporte.findFirst({
      where: {
        mantenedoraId,
        unitId,
        nome,
        isActive: true,
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('Já existe uma empresa de transporte com este nome.');
  }
}
