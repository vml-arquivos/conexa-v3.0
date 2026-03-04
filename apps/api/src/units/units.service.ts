import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import type { CreateUnitDto, UpdateUnitDto } from './units.dto';

/** Roles que podem criar/editar/excluir unidades */
const WRITE_ROLES = ['DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL'];
/** Roles que podem listar unidades */
const READ_ROLES = ['DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL', 'UNIDADE'];

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private hasRole(user: JwtPayload, roles: string[]): boolean {
    return user.roles.some((r) => roles.includes(r.level));
  }

  private assertReadAccess(user: JwtPayload): void {
    if (!this.hasRole(user, READ_ROLES)) {
      throw new ForbiddenException('Sem permissão para listar unidades');
    }
  }

  private assertWriteAccess(user: JwtPayload): void {
    if (!this.hasRole(user, WRITE_ROLES)) {
      throw new ForbiddenException(
        'Apenas STAFF_CENTRAL, MANTENEDORA e DEVELOPER podem criar/editar/excluir unidades',
      );
    }
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  /**
   * GET /units
   * Lista todas as unidades da mantenedora do usuário.
   * Suporta ?include=counts para incluir contagens de usuários/turmas/crianças.
   */
  async findAll(
    user: JwtPayload,
    options: { includeCounts?: boolean; limit?: number } = {},
  ) {
    this.assertReadAccess(user);

    const { includeCounts = false, limit = 100 } = options;

    const units = await this.prisma.unit.findMany({
      where: { mantenedoraId: user.mantenedoraId },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        ...(includeCounts
          ? {
              _count: {
                select: {
                  users: true,
                  classrooms: true,
                  children: true,
                },
              },
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: limit,
    });

    return units;
  }

  /**
   * GET /units/:id
   * Retorna uma unidade específica.
   */
  async findOne(user: JwtPayload, id: string) {
    this.assertReadAccess(user);

    const unit = await this.prisma.unit.findFirst({
      where: { id, mantenedoraId: user.mantenedoraId },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            classrooms: true,
            children: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Unidade não encontrada');
    }

    return unit;
  }

  /**
   * POST /units
   * Cria uma nova unidade.
   */
  async create(user: JwtPayload, dto: CreateUnitDto) {
    this.assertWriteAccess(user);

    // Validação de campos obrigatórios
    if (!dto.name?.trim()) {
      throw new BadRequestException('O campo "name" é obrigatório');
    }
    if (!dto.code?.trim()) {
      throw new BadRequestException('O campo "code" é obrigatório');
    }

    // Normalização
    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();
    const state = dto.state?.trim().toUpperCase().slice(0, 2) || undefined;
    const email = dto.email?.trim() || undefined;
    const phone = dto.phone?.trim() || undefined;
    const address = dto.address?.trim() || undefined;
    const city = dto.city?.trim() || undefined;
    const zipCode = dto.zipCode?.trim() || undefined;

    // Verificar duplicidade de código por mantenedora
    const existing = await this.prisma.unit.findFirst({
      where: { mantenedoraId: user.mantenedoraId, code },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        `Já existe uma unidade com o código "${code}" nesta mantenedora`,
      );
    }

    const unit = await this.prisma.unit.create({
      data: {
        mantenedoraId: user.mantenedoraId,
        name,
        code,
        address,
        city,
        state,
        zipCode,
        email,
        phone,
        isActive: dto.isActive ?? true,
        createdBy: user.email,
        updatedBy: user.email,
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return unit;
  }

  /**
   * PATCH /units/:id  (e PUT /units/:id para compatibilidade com frontend)
   * Atualiza uma unidade existente.
   * Nota: o campo "code" NÃO pode ser alterado.
   */
  async update(user: JwtPayload, id: string, dto: UpdateUnitDto) {
    this.assertWriteAccess(user);

    // Verificar se a unidade pertence à mantenedora do usuário
    const existing = await this.prisma.unit.findFirst({
      where: { id, mantenedoraId: user.mantenedoraId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Unidade não encontrada');
    }

    // Normalização dos campos opcionais
    const data: Record<string, unknown> = { updatedBy: user.email };
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.address !== undefined) data.address = dto.address.trim() || null;
    if (dto.city !== undefined) data.city = dto.city.trim() || null;
    if (dto.state !== undefined)
      data.state = dto.state.trim().toUpperCase().slice(0, 2) || null;
    if (dto.zipCode !== undefined) data.zipCode = dto.zipCode.trim() || null;
    if (dto.email !== undefined) data.email = dto.email.trim() || null;
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const unit = await this.prisma.unit.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return unit;
  }

  /**
   * DELETE /units/:id
   * Remove uma unidade (soft delete via isActive=false ou hard delete).
   * Por segurança, faz soft delete (isActive=false) se tiver dados vinculados.
   */
  async remove(user: JwtPayload, id: string) {
    this.assertWriteAccess(user);

    const existing = await this.prisma.unit.findFirst({
      where: { id, mantenedoraId: user.mantenedoraId },
      select: {
        id: true,
        _count: {
          select: {
            users: true,
            classrooms: true,
            children: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Unidade não encontrada');
    }

    const hasData =
      existing._count.users > 0 ||
      existing._count.classrooms > 0 ||
      existing._count.children > 0;

    if (hasData) {
      // Soft delete: desativar em vez de remover (preserva integridade referencial)
      await this.prisma.unit.update({
        where: { id },
        data: { isActive: false, updatedBy: user.email },
      });
      return {
        message:
          'Unidade desativada (possui dados vinculados — use isActive=false para reativar)',
        softDeleted: true,
      };
    }

    // Hard delete: sem dados vinculados
    await this.prisma.unit.delete({ where: { id } });
    return { message: 'Unidade excluída com sucesso', softDeleted: false };
  }
}
