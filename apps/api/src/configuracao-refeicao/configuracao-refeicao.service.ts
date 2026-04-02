import {
  Injectable, NotFoundException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel, RoleType } from '@prisma/client';
import { CreateConfiguracaoRefeicaoDto } from './dto/create-configuracao-refeicao.dto';

// FASE 1: RoleTypes com acesso legítimo à configuração de refeições da unidade.
// Professor e outros perfis de UNIDADE sem tipo específico não devem operar este módulo.
const CONFIGURACAO_ALLOWED_TYPES: RoleType[] = [
  RoleType.UNIDADE_NUTRICIONISTA,
  RoleType.UNIDADE_DIRETOR,
  RoleType.UNIDADE_COORDENADOR_PEDAGOGICO,
  RoleType.UNIDADE_ADMINISTRATIVO,
];

// ─── Helper de acesso ────────────────────────────────────────────────────────
function assertUnitAccess(user: JwtPayload, unitId: string): void {
  const isGlobal = user.roles.some(
    (r) =>
      r.level === RoleLevel.DEVELOPER ||
      r.level === RoleLevel.MANTENEDORA ||
      r.level === RoleLevel.STAFF_CENTRAL,
  );
  if (isGlobal) return;

  // UNIDADE: validar RoleType específico
  const isUnidade = user.roles.some((r) => r.level === RoleLevel.UNIDADE);
  if (isUnidade) {
    const hasAllowedType = user.roles.some((r) =>
      CONFIGURACAO_ALLOWED_TYPES.includes(r.type as RoleType),
    );
    if (!hasAllowedType)
      throw new ForbiddenException('Perfil sem acesso à configuração de refeições');
    if (user.unitId !== unitId)
      throw new ForbiddenException('Acesso negado a esta unidade');
    return;
  }

  throw new ForbiddenException('Acesso negado a esta unidade');
}

@Injectable()
export class ConfiguracaoRefeicaoService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Listar por unidade ────────────────────────────────────────────────────
  async findByUnit(unitId: string, user: JwtPayload) {
    assertUnitAccess(user, unitId);
    return this.prisma.configuracaoRefeicao.findMany({
      where: { unitId, ativo: true },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
  }

  // ── Listar todas (incluindo inativas) ─────────────────────────────────────
  async findAllByUnit(unitId: string, user: JwtPayload) {
    assertUnitAccess(user, unitId);
    return this.prisma.configuracaoRefeicao.findMany({
      where: { unitId },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
  }

  // ── Criar ─────────────────────────────────────────────────────────────────
  async create(dto: CreateConfiguracaoRefeicaoDto, user: JwtPayload) {
    assertUnitAccess(user, dto.unitId);

    const existing = await this.prisma.configuracaoRefeicao.findUnique({
      where: { unitId_nome: { unitId: dto.unitId, nome: dto.nome } },
    });
    if (existing) {
      throw new ConflictException(
        `Já existe uma refeição com o nome "${dto.nome}" para esta unidade`,
      );
    }

    return this.prisma.configuracaoRefeicao.create({
      data: {
        unitId: dto.unitId,
        nome: dto.nome,
        horario: dto.horario,
        ordem: dto.ordem ?? 0,
        ativo: dto.ativo ?? true,
      },
    });
  }

  // ── Atualizar ─────────────────────────────────────────────────────────────
  async update(
    id: string,
    dto: Partial<CreateConfiguracaoRefeicaoDto>,
    user: JwtPayload,
  ) {
    const config = await this.prisma.configuracaoRefeicao.findUnique({
      where: { id },
    });
    if (!config) throw new NotFoundException('Configuração de refeição não encontrada');
    assertUnitAccess(user, config.unitId);

    if (dto.nome && dto.nome !== config.nome) {
      const conflict = await this.prisma.configuracaoRefeicao.findUnique({
        where: { unitId_nome: { unitId: config.unitId, nome: dto.nome } },
      });
      if (conflict) {
        throw new ConflictException(
          `Já existe uma refeição com o nome "${dto.nome}" para esta unidade`,
        );
      }
    }

    return this.prisma.configuracaoRefeicao.update({
      where: { id },
      data: {
        nome: dto.nome,
        horario: dto.horario,
        ordem: dto.ordem,
        ativo: dto.ativo,
      },
    });
  }

  // ── Remover (soft delete via ativo=false) ─────────────────────────────────
  async remove(id: string, user: JwtPayload) {
    const config = await this.prisma.configuracaoRefeicao.findUnique({
      where: { id },
    });
    if (!config) throw new NotFoundException('Configuração de refeição não encontrada');
    assertUnitAccess(user, config.unitId);

    return this.prisma.configuracaoRefeicao.update({
      where: { id },
      data: { ativo: false },
    });
  }

  // ── Excluir permanentemente (apenas DEVELOPER/MANTENEDORA) ────────────────
  async hardDelete(id: string, user: JwtPayload) {
    if (
      !user.roles.some(
        (r) => r.level === RoleLevel.DEVELOPER || r.level === RoleLevel.MANTENEDORA,
      )
    ) {
      throw new ForbiddenException('Apenas administradores podem excluir permanentemente');
    }
    const config = await this.prisma.configuracaoRefeicao.findUnique({
      where: { id },
    });
    if (!config) throw new NotFoundException('Configuração de refeição não encontrada');

    await this.prisma.configuracaoRefeicao.delete({ where: { id } });
    return { deleted: true };
  }
}
