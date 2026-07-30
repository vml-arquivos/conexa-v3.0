import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  EnrollmentStatus,
  Prisma,
  RoleLevel,
  RoleType,
  UserStatus,
} from '@prisma/client';
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import * as bcrypt from 'bcrypt';

// ─── Mapeamento RoleType → RoleLevel ─────────────────────────────────────────
const ROLE_TYPE_TO_LEVEL: Record<RoleType, RoleLevel> = {
  DEVELOPER: RoleLevel.DEVELOPER,
  MANTENEDORA_ADMIN: RoleLevel.MANTENEDORA,
  MANTENEDORA_FINANCEIRO: RoleLevel.MANTENEDORA,
  STAFF_CENTRAL_PEDAGOGICO: RoleLevel.STAFF_CENTRAL,
  STAFF_CENTRAL_PSICOLOGIA: RoleLevel.STAFF_CENTRAL,
  UNIDADE_DIRETOR: RoleLevel.UNIDADE,
  UNIDADE_COORDENADOR_PEDAGOGICO: RoleLevel.UNIDADE,
  UNIDADE_ADMINISTRATIVO: RoleLevel.UNIDADE,
  UNIDADE_NUTRICIONISTA: RoleLevel.UNIDADE,
  PROFESSOR: RoleLevel.PROFESSOR,
  PROFESSOR_AUXILIAR: RoleLevel.PROFESSOR,
};

const ADMIN_USER_SELECT = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  cpf: true,
  status: true,
  emailVerified: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
  unitId: true,
  unit: { select: { name: true, code: true } },
  roles: {
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
    select: {
      scopeLevel: true,
      role: { select: { type: true, level: true } },
      unitScopes: { select: { unitId: true } },
    },
  },
});

type AdminUserRecord = Prisma.UserGetPayload<{
  select: typeof ADMIN_USER_SELECT;
}>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function norm(v: unknown): string {
  return String(v ?? '').trim();
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ') || '.';
  return { firstName, lastName };
}

/**
 * dd/mm/yyyy ou ISO -> Date UTC (00:00Z).
 * inválido -> null (não corromper com "hoje").
 */
function parseBirthDate(raw: string): Date | null {
  const s = norm(raw);
  if (!s) return null;

  const iso = new Date(s);
  if (!Number.isNaN(iso.getTime())) {
    return new Date(Date.UTC(iso.getUTCFullYear(), iso.getUTCMonth(), iso.getUTCDate()));
  }

  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const mon = Number(m[2]);
  const year = Number(m[3]);
  if (!day || !mon || !year) return null;
  return new Date(Date.UTC(year, mon - 1, day));
}

function classroomCodeFromName(name: string): string {
  const ascii = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  return (
    ascii
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50) || 'TURMA'
  );
}

function normalizeAdminUser(user: AdminUserRecord) {
  const unit = user.unit
    ? { name: user.unit.name, unitCode: user.unit.code }
    : undefined;

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    cpf: user.cpf,
    status: user.status,
    emailVerified: user.emailVerified,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    unitId: user.unitId,
    unit,
    // Somente vínculos ATIVOS são expostos. Incluir a unidade também dentro
    // do papel mantém compatibilidade com as duas telas administrativas.
    roles: user.roles.map((assignment) => ({
      roleType: assignment.role.type,
      scopeLevel: assignment.role.level,
      unitScopes: assignment.unitScopes.map((scope) => scope.unitId),
      unit,
    })),
  };
}

// ─── DTOs internos ────────────────────────────────────────────────────────────
export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  cpf?: string;
  roleType: RoleType;
  /** unitCode (ex.: "ARARA-CAN") — obrigatório para roles de unidade/professor */
  unitCode?: string;
  status?: UserStatus;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;
  cpf?: string;
  roleType?: RoleType;
  unitCode?: string;
  status?: UserStatus;
}

// ─── Service ─────────────────────────────────────────────────────────────────
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(private readonly prisma: PrismaService) {}

  private isDeveloper(user: JwtPayload): boolean {
    return Array.isArray(user?.roles) && user.roles.some((r) => r.level === RoleLevel.DEVELOPER);
  }

  private hasLevel(user: JwtPayload, level: RoleLevel): boolean {
    return Array.isArray(user?.roles) && user.roles.some((role) => role.level === level);
  }

  private assertCanAssignRole(actor: JwtPayload, roleType: RoleType): void {
    const targetLevel = ROLE_TYPE_TO_LEVEL[roleType];
    if (!targetLevel) {
      throw new BadRequestException(`roleType inválido: ${roleType}`);
    }

    if (this.isDeveloper(actor)) return;

    // Nenhum perfil abaixo de DEVELOPER pode promover outro usuário a
    // desenvolvedor.
    if (targetLevel === RoleLevel.DEVELOPER) {
      throw new ForbiddenException('Apenas DEVELOPER pode atribuir este perfil');
    }

    if (this.hasLevel(actor, RoleLevel.MANTENEDORA)) return;

    if (this.hasLevel(actor, RoleLevel.STAFF_CENTRAL)) {
      if (
        targetLevel === RoleLevel.STAFF_CENTRAL ||
        targetLevel === RoleLevel.UNIDADE ||
        targetLevel === RoleLevel.PROFESSOR
      ) {
        return;
      }
      throw new ForbiddenException('Perfil acima da permissão do usuário autenticado');
    }

    if (this.hasLevel(actor, RoleLevel.UNIDADE)) {
      if (targetLevel === RoleLevel.UNIDADE || targetLevel === RoleLevel.PROFESSOR) {
        return;
      }
      throw new ForbiddenException('Gestores de unidade só podem atribuir perfis da própria unidade');
    }

    throw new ForbiddenException('Perfil sem permissão para gerenciar usuários');
  }

  private async assertUnitAccess(user: JwtPayload, unitId: string): Promise<void> {
    if (!user?.mantenedoraId) throw new BadRequestException('mantenedoraId ausente no token');
    if (this.isDeveloper(user)) return;

    // MANTENEDORA: qualquer unidade da mesma mantenedora
    const isMantenedora = user.roles.some((r) => r.level === RoleLevel.MANTENEDORA);
    if (isMantenedora) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: unitId },
        select: { mantenedoraId: true },
      });
      if (!unit || unit.mantenedoraId !== user.mantenedoraId) {
        throw new ForbiddenException('Sem acesso à unidade informada');
      }
      return;
    }

    // STAFF_CENTRAL: acesso a todas as unidades da mantenedora (ou unitScopes se restrito)
    const isStaffCentral = user.roles.some((r) => r.level === RoleLevel.STAFF_CENTRAL);
    if (isStaffCentral) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: unitId },
        select: { mantenedoraId: true },
      });
      if (!unit || unit.mantenedoraId !== user.mantenedoraId) {
        throw new ForbiddenException('Sem acesso à unidade informada');
      }
      const staffRole = user.roles.find((r) => r.level === RoleLevel.STAFF_CENTRAL);
      const scopes = staffRole?.unitScopes ?? [];
      if (scopes.length > 0 && !scopes.includes(unitId)) {
        throw new ForbiddenException('Sem acesso à unidade informada');
      }
      return;
    }

    // UNIDADE: somente sua própria unitId
    const isUnidade = user.roles.some((r) => r.level === RoleLevel.UNIDADE);
    if (isUnidade) {
      if (user.unitId !== unitId) throw new ForbiddenException('Sem acesso à unidade informada');
      return;
    }

    throw new ForbiddenException('Perfil sem permissão para importação');
  }

  /**
   * Garante que o Role do tipo informado existe para a mantenedora.
   * Retorna o Role encontrado ou criado.
   */
  private async ensureRole(
    mantenedoraId: string,
    roleType: RoleType,
    client: Prisma.TransactionClient = this.prisma as unknown as Prisma.TransactionClient,
  ) {
    const level = ROLE_TYPE_TO_LEVEL[roleType];
    if (!level) throw new BadRequestException(`roleType inválido: ${roleType}`);

    return client.role.upsert({
      where: { mantenedoraId_type: { mantenedoraId, type: roleType } },
      create: {
        mantenedoraId,
        type: roleType,
        level,
        name: roleType.replace(/_/g, ' '),
        isActive: true,
        isCustom: false,
      },
      update: { level, isActive: true },
    });
  }

  // ─── Lista usuários ──────────────────────────────────────────────────────────
  /**
   * Lista usuários acessíveis pelo usuário autenticado.
   * - DEVELOPER / MANTENEDORA: todos os usuários da mesma mantenedora (com filtro opcional por unitId)
   * - UNIDADE: apenas usuários da própria unidade
   */
  async listUsers(
    user: JwtPayload,
    opts: { limit: number; unitId?: string },
  ) {
    if (!user?.mantenedoraId) throw new BadRequestException('mantenedoraId ausente no token');

    const isMantenedora =
      this.isDeveloper(user) ||
      user.roles.some((r) => r.level === RoleLevel.MANTENEDORA) ||
      user.roles.some((r) => r.level === RoleLevel.STAFF_CENTRAL);

    const whereUnitId: string | undefined = isMantenedora
      ? (opts.unitId || undefined)
      : (user.unitId || undefined);
    const take = Number.isFinite(opts.limit)
      ? Math.min(Math.max(Math.trunc(opts.limit), 1), 500)
      : 200;

    const users = await this.prisma.user.findMany({
      where: {
        mantenedoraId: user.mantenedoraId,
        ...(whereUnitId ? { unitId: whereUnitId } : {}),
      },
      select: ADMIN_USER_SELECT,
      take,
      orderBy: { createdAt: 'desc' },
    });

    const normalized = users.map(normalizeAdminUser);

    return { ok: true, total: normalized.length, users: normalized };
  }

  // ─── Lista unidades ──────────────────────────────────────────────────────────
  /**
   * Lista unidades acessíveis pelo usuário autenticado.
   * - DEVELOPER / MANTENEDORA: todas as unidades da mesma mantenedora
   * - UNIDADE: apenas a própria unidade
   */
  async listUnits(user: JwtPayload) {
    if (!user?.mantenedoraId) throw new BadRequestException('mantenedoraId ausente no token');

    const isMantenedora =
      this.isDeveloper(user) ||
      user.roles.some((r) => r.level === RoleLevel.MANTENEDORA) ||
      user.roles.some((r) => r.level === RoleLevel.STAFF_CENTRAL);

    const units = await this.prisma.unit.findMany({
      where: {
        mantenedoraId: user.mantenedoraId,
        ...(isMantenedora ? {} : { id: user.unitId || undefined }),
      },
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    // Normalizar: expor `unitCode` para compatibilidade com o frontend
    const normalized = units.map((u) => ({ ...u, unitCode: u.code }));

    return { ok: true, total: normalized.length, units: normalized };
  }

  // ─── Criar usuário ───────────────────────────────────────────────────────────
  /**
   * Cria um usuário com role e, se necessário, vínculo de unidade.
   * Transação Prisma garante consistência.
   */
  async createUser(actor: JwtPayload, dto: CreateUserDto) {
    if (!actor?.mantenedoraId) throw new BadRequestException('mantenedoraId ausente no token');

    // Validações básicas
    if (!dto.firstName?.trim()) throw new BadRequestException('firstName é obrigatório');
    if (!dto.lastName?.trim()) throw new BadRequestException('lastName é obrigatório');
    if (!dto.email?.trim()) throw new BadRequestException('email é obrigatório');
    if (!dto.password || dto.password.length < 6)
      throw new BadRequestException('password deve ter pelo menos 6 caracteres');
    if (!dto.roleType) throw new BadRequestException('roleType é obrigatório');

    const roleLevel = ROLE_TYPE_TO_LEVEL[dto.roleType];
    if (!roleLevel) throw new BadRequestException(`roleType inválido: ${dto.roleType}`);
    this.assertCanAssignRole(actor, dto.roleType);

    const needsUnit =
      roleLevel === RoleLevel.UNIDADE || roleLevel === RoleLevel.PROFESSOR;

    if (needsUnit && !dto.unitCode?.trim())
      throw new BadRequestException('unitCode é obrigatório para este perfil');

    // Resolver unitId a partir do unitCode
    let unitId: string | null = null;
    if (dto.unitCode?.trim()) {
      const unit = await this.prisma.unit.findFirst({
        where: { code: dto.unitCode.trim(), mantenedoraId: actor.mantenedoraId },
        select: { id: true },
      });
      if (!unit) throw new BadRequestException(`Unidade com código "${dto.unitCode}" não encontrada`);
      unitId = unit.id;
    }
    if (unitId) {
      await this.assertUnitAccess(actor, unitId);
    }

    // Verificar e-mail duplicado
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Já existe um usuário com este e-mail');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const role = await this.ensureRole(actor.mantenedoraId, dto.roleType, tx);

      // 1. Criar usuário
      const newUser = await tx.user.create({
        data: {
          mantenedoraId: actor.mantenedoraId,
          unitId,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email: dto.email.trim().toLowerCase(),
          password: hashedPassword,
          phone: dto.phone?.trim() || null,
          cpf: dto.cpf?.trim() || null,
          status: dto.status ?? UserStatus.ATIVO,
          createdBy: actor.sub,
        },
        select: { id: true, email: true, firstName: true, lastName: true, unitId: true, status: true },
      });

      // 2. Criar UserRole
      const userRole = await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleId: role.id,
          scopeLevel: role.level,
          isActive: true,
        },
        select: { id: true },
      });

      // 3. Criar UserRoleUnitScope
      if (unitId) {
        // Role de unidade: escopo apenas na unidade
        await tx.userRoleUnitScope.create({
          data: { userRoleId: userRole.id, unitId },
        });
      } else if (
        role.level === RoleLevel.STAFF_CENTRAL ||
        role.level === RoleLevel.MANTENEDORA
      ) {
        // Staff Central / Mantenedora: escopo em todas as unidades da mantenedora
        const allUnits = await tx.unit.findMany({
          where: { mantenedoraId: actor.mantenedoraId },
          select: { id: true },
        });
        for (const u of allUnits) {
          await tx.userRoleUnitScope.create({
            data: { userRoleId: userRole.id, unitId: u.id },
          });
        }
      }

      return newUser;
    });

    this.logger.log(`Usuário criado: ${created.email} por ${actor.email}`);
    const persisted = await this.prisma.user.findUnique({
      where: { id: created.id },
      select: ADMIN_USER_SELECT,
    });
    if (!persisted) throw new NotFoundException('Usuário criado não foi encontrado');

    return {
      ok: true,
      persisted: true,
      user: normalizeAdminUser(persisted),
    };
  }

  // ─── Atualizar usuário ───────────────────────────────────────────────────────
  /**
   * Atualiza dados de um usuário existente.
   * Cirúrgico: só altera os campos enviados.
   */
  async updateUser(actor: JwtPayload, userId: string, dto: UpdateUserDto) {
    if (!actor?.mantenedoraId) throw new BadRequestException('mantenedoraId ausente no token');

    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mantenedoraId: true,
        email: true,
        unitId: true,
        roles: {
          where: { isActive: true },
          select: {
            role: { select: { type: true, level: true } },
          },
        },
      },
    });
    if (!target) throw new NotFoundException('Usuário não encontrado');
    if (target.mantenedoraId !== actor.mantenedoraId)
      throw new ForbiddenException('Sem permissão para editar este usuário');

    const actorIsUnit = this.hasLevel(actor, RoleLevel.UNIDADE) && !this.isDeveloper(actor);
    if (actorIsUnit && (!actor.unitId || target.unitId !== actor.unitId)) {
      throw new ForbiddenException('Gestores de unidade só podem editar usuários da própria unidade');
    }
    if (target.unitId) {
      await this.assertUnitAccess(actor, target.unitId);
    }

    if (dto.firstName !== undefined && !dto.firstName.trim())
      throw new BadRequestException('firstName não pode ser vazio');
    if (dto.lastName !== undefined && !dto.lastName.trim())
      throw new BadRequestException('lastName não pode ser vazio');
    if (dto.email !== undefined && !dto.email.trim())
      throw new BadRequestException('email não pode ser vazio');
    if (
      dto.status !== undefined &&
      !Object.values(UserStatus).includes(dto.status)
    ) {
      throw new BadRequestException(`status inválido: ${dto.status}`);
    }

    // Verificar e-mail duplicado (se estiver mudando)
    if (dto.email && dto.email.trim().toLowerCase() !== target.email) {
      const dup = await this.prisma.user.findUnique({
        where: { email: dto.email.trim().toLowerCase() },
        select: { id: true },
      });
      if (dup) throw new ConflictException('Já existe um usuário com este e-mail');
    }

    const currentRole = target.roles[0]?.role;
    const requestedRoleLevel = dto.roleType
      ? ROLE_TYPE_TO_LEVEL[dto.roleType]
      : currentRole?.level;

    if (dto.roleType) {
      if (!requestedRoleLevel)
        throw new BadRequestException(`roleType inválido: ${dto.roleType}`);
      this.assertCanAssignRole(actor, dto.roleType);
    }

    const roleNeedsUnit =
      requestedRoleLevel === RoleLevel.UNIDADE ||
      requestedRoleLevel === RoleLevel.PROFESSOR;

    // A unidade começa com o valor persistido. Se o perfil mudou para um papel
    // central, ela é removida explicitamente; se unitCode veio, é resolvida
    // sempre dentro da mantenedora autenticada.
    let resolvedUnitId: string | null = target.unitId;
    let shouldUpdateUnit = false;
    if (dto.unitCode !== undefined) {
      shouldUpdateUnit = true;
      if (dto.unitCode?.trim()) {
        const unit = await this.prisma.unit.findFirst({
          where: { code: dto.unitCode.trim(), mantenedoraId: actor.mantenedoraId },
          select: { id: true },
        });
        if (!unit) throw new BadRequestException(`Unidade com código "${dto.unitCode}" não encontrada`);
        resolvedUnitId = unit.id;
      } else {
        resolvedUnitId = null;
      }
    }
    if (dto.roleType && !roleNeedsUnit) {
      shouldUpdateUnit = true;
      resolvedUnitId = null;
    }
    if (roleNeedsUnit && !resolvedUnitId) {
      throw new BadRequestException('unitCode é obrigatório para este perfil');
    }
    if (!roleNeedsUnit && dto.unitCode?.trim()) {
      throw new BadRequestException('Este perfil não deve possuir unidade local');
    }
    if (resolvedUnitId) {
      await this.assertUnitAccess(actor, resolvedUnitId);
    }
    if (actorIsUnit && resolvedUnitId !== actor.unitId) {
      throw new ForbiddenException('Não é permitido mover usuários para outra unidade');
    }

    // Hash de senha se fornecida
    let hashedPassword: string | undefined;
    if (dto.password) {
      if (dto.password.length < 6) throw new BadRequestException('password deve ter pelo menos 6 caracteres');
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Atualizar dados do usuário
      const updateData: Record<string, unknown> = { updatedBy: actor.sub };
      if (dto.firstName?.trim()) updateData.firstName = dto.firstName.trim();
      if (dto.lastName?.trim()) updateData.lastName = dto.lastName.trim();
      if (dto.email?.trim()) updateData.email = dto.email.trim().toLowerCase();
      if (hashedPassword) updateData.password = hashedPassword;
      if (dto.phone !== undefined) updateData.phone = dto.phone?.trim() || null;
      if (dto.cpf !== undefined) updateData.cpf = dto.cpf?.trim() || null;
      if (dto.status) updateData.status = dto.status;
      if (shouldUpdateUnit) updateData.unitId = resolvedUnitId;

      const u = await tx.user.update({
        where: { id: userId },
        data: updateData,
        select: { id: true, email: true, firstName: true, lastName: true, unitId: true, status: true },
      });

      // 2. Atualizar role se informado
      if (dto.roleType) {
        const role = await this.ensureRole(actor.mantenedoraId, dto.roleType, tx);

        // Limpar todos os escopos antigos antes de trocar o papel. Os registros
        // de UserRole são mantidos para auditoria, mas só um fica ativo.
        const assignments = await tx.userRole.findMany({
          where: { userId },
          select: { id: true },
        });
        const assignmentIds = assignments.map((assignment) => assignment.id);
        if (assignmentIds.length) {
          await tx.userRoleUnitScope.deleteMany({
            where: { userRoleId: { in: assignmentIds } },
          });
        }

        // Desativar roles anteriores
        await tx.userRole.updateMany({
          where: { userId },
          data: { isActive: false },
        });

        // Criar novo UserRole
        const userRole = await tx.userRole.upsert({
          where: { userId_roleId: { userId, roleId: role.id } },
          create: { userId, roleId: role.id, scopeLevel: role.level, isActive: true },
          update: { scopeLevel: role.level, isActive: true },
          select: { id: true },
        });

        if (roleNeedsUnit && resolvedUnitId) {
          await tx.userRoleUnitScope.create({
            data: { userRoleId: userRole.id, unitId: resolvedUnitId },
          });
        } else if (
          role.level === RoleLevel.STAFF_CENTRAL ||
          role.level === RoleLevel.MANTENEDORA
        ) {
          const allUnits = await tx.unit.findMany({
            where: { mantenedoraId: actor.mantenedoraId },
            select: { id: true },
          });
          if (allUnits.length) {
            await tx.userRoleUnitScope.createMany({
              data: allUnits.map((unit) => ({
                userRoleId: userRole.id,
                unitId: unit.id,
              })),
              skipDuplicates: true,
            });
          }
        }
      } else if (shouldUpdateUnit && resolvedUnitId) {
        // Alteração isolada de unidade: sincronizar o escopo dos papéis ativos
        // de unidade/professor sem criar ou desativar papel algum.
        const activeAssignments = await tx.userRole.findMany({
          where: { userId, isActive: true },
          select: {
            id: true,
            role: { select: { level: true } },
          },
        });
        for (const assignment of activeAssignments) {
          if (
            assignment.role.level === RoleLevel.UNIDADE ||
            assignment.role.level === RoleLevel.PROFESSOR
          ) {
            await tx.userRoleUnitScope.deleteMany({
              where: { userRoleId: assignment.id },
            });
            await tx.userRoleUnitScope.create({
              data: { userRoleId: assignment.id, unitId: resolvedUnitId },
            });
          }
        }
      }

      return u;
    });

    this.logger.log(`Usuário atualizado: ${updated.email} por ${actor.email}`);
    // Leitura pós-commit: a resposta vem da mesma fonte que alimenta a lista,
    // comprovando que nome, status, unidade e papel foram persistidos.
    const persisted = await this.prisma.user.findUnique({
      where: { id: updated.id },
      select: ADMIN_USER_SELECT,
    });
    if (!persisted) throw new NotFoundException('Usuário atualizado não foi encontrado');

    return {
      ok: true,
      persisted: true,
      user: normalizeAdminUser(persisted),
    };
  }

  // ─── Import CSV ──────────────────────────────────────────────────────────────
  async importStructureCsv(file: Express.Multer.File, user: JwtPayload, unitIdFromQuery?: string) {
    if (!file?.buffer?.length) throw new BadRequestException('Arquivo vazio');

    const unitId = norm(unitIdFromQuery) || norm(user.unitId);
    if (!unitId) {
      throw new BadRequestException('unitId obrigatório (use ?unitId=... para perfil MANTENEDORA)');
    }

    await this.assertUnitAccess(user, unitId);

    const rows: any[] = [];
    await new Promise<void>((resolve, reject) => {
      Readable.from(file.buffer)
        .pipe(csvParser())
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    const stats = {
      rows: rows.length,
      classroomsUpserted: 0,
      childrenCreated: 0,
      enrollmentsUpserted: 0,
      skipped: 0,
      skippedReasons: { missingNameOrClass: 0, invalidBirthDate: 0 },
    };

    for (const row of rows) {
      const fullName = norm(row['ALUNO'] ?? row['Aluno'] ?? row['aluno']);
      const turmaName = norm(row['TURMA'] ?? row['Turma'] ?? row['turma']);
      const rawBirth = norm(row['NASCIMENTO'] ?? row['Nascimento'] ?? row['nascimento']);

      if (!fullName || !turmaName) {
        stats.skipped++;
        stats.skippedReasons.missingNameOrClass++;
        continue;
      }

      const birthDate = parseBirthDate(rawBirth);
      if (!birthDate) {
        stats.skipped++;
        stats.skippedReasons.invalidBirthDate++;
        continue;
      }

      const { firstName, lastName } = splitName(fullName);
      const classroomCode = classroomCodeFromName(turmaName);

      await this.prisma.$transaction(async (tx) => {
        const classroom = await tx.classroom.upsert({
          where: { unitId_code: { unitId, code: classroomCode } },
          update: { name: turmaName, updatedBy: user.sub },
          create: { unitId, name: turmaName, code: classroomCode, createdBy: user.sub },
          select: { id: true },
        });
        stats.classroomsUpserted++;

        const existing = await tx.child.findFirst({
          where: {
            mantenedoraId: user.mantenedoraId,
            unitId,
            firstName: { equals: firstName, mode: 'insensitive' },
            lastName: { equals: lastName, mode: 'insensitive' },
            dateOfBirth: birthDate,
          },
          select: { id: true },
        });

        const childId =
          existing?.id ??
          (
            await tx.child.create({
              data: {
                mantenedoraId: user.mantenedoraId,
                unitId,
                firstName,
                lastName,
                dateOfBirth: birthDate,
                createdBy: user.sub,
              },
              select: { id: true },
            })
          ).id;

        if (!existing) stats.childrenCreated++;

        await tx.enrollment.upsert({
          where: { childId_classroomId: { childId, classroomId: classroom.id } },
          update: { status: EnrollmentStatus.ATIVA, withdrawalDate: null, updatedBy: user.sub },
          create: {
            childId,
            classroomId: classroom.id,
            enrollmentDate: new Date(),
            status: EnrollmentStatus.ATIVA,
            createdBy: user.sub,
          },
        });
        stats.enrollmentsUpserted++;
      });
    }

    this.logger.log(`Import CEPI concluído: ${JSON.stringify(stats)}`);
    return { ok: true, unitId, stats };
  }
}
