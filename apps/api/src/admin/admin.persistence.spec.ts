import { ForbiddenException } from '@nestjs/common';
import { RoleLevel, RoleType, UserStatus } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';

const developer: JwtPayload = {
  sub: 'developer-1',
  email: 'developer@cocris.org.br',
  mantenedoraId: 'mant-1',
  roles: [{
    roleId: 'role-developer',
    level: RoleLevel.DEVELOPER,
    type: RoleType.DEVELOPER,
    unitScopes: [],
  }],
};

const unitManager: JwtPayload = {
  sub: 'manager-1',
  email: 'gestor@cocris.org.br',
  mantenedoraId: 'mant-1',
  unitId: 'unit-a',
  roles: [{
    roleId: 'role-manager',
    level: RoleLevel.UNIDADE,
    type: RoleType.UNIDADE_DIRETOR,
    unitScopes: ['unit-a'],
  }],
};

function adminRecord(overrides: Record<string, unknown> = {}) {
  const unit = { name: 'CEPI Sabiá', code: 'SABIA' };
  return {
    id: 'user-1',
    firstName: 'Maria',
    lastName: 'Silva',
    email: 'maria@cocris.org.br',
    phone: null,
    cpf: null,
    status: UserStatus.ATIVO,
    emailVerified: true,
    lastLogin: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-07-30T12:00:00Z'),
    unitId: 'unit-a',
    unit,
    roles: [{
      scopeLevel: RoleLevel.PROFESSOR,
      role: { type: RoleType.PROFESSOR, level: RoleLevel.PROFESSOR },
      unitScopes: [{ unitId: 'unit-a' }],
    }],
    ...overrides,
  };
}

describe('AdminService — persistência de usuários', () => {
  const tx = {
    user: { update: jest.fn() },
    role: { upsert: jest.fn() },
    userRole: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    userRoleUnitScope: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    unit: { findMany: jest.fn() },
  };

  const prisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    unit: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    role: { upsert: jest.fn() },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx)),
  };

  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(prisma as unknown as PrismaService);
    tx.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'maria@cocris.org.br',
      firstName: 'Maria',
      lastName: 'Silva',
      unitId: 'unit-a',
      status: UserStatus.ATIVO,
    });
    tx.userRole.findMany.mockResolvedValue([{ id: 'assignment-old' }]);
    tx.userRole.updateMany.mockResolvedValue({ count: 1 });
    tx.userRole.upsert.mockResolvedValue({ id: 'assignment-new' });
    tx.userRoleUnitScope.deleteMany.mockResolvedValue({ count: 1 });
    tx.userRoleUnitScope.create.mockResolvedValue({ id: 'scope-1' });
    tx.userRoleUnitScope.createMany.mockResolvedValue({ count: 2 });
  });

  it('lista somente papéis ativos e devolve unidade no contrato das telas', async () => {
    prisma.user.findMany.mockResolvedValue([adminRecord()]);

    const result = await service.listUsers(developer, { limit: 200 });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          roles: expect.objectContaining({ where: { isActive: true } }),
        }),
      }),
    );
    expect(result.users[0]).toMatchObject({
      unit: { unitCode: 'SABIA' },
      roles: [{
        roleType: RoleType.PROFESSOR,
        unit: { unitCode: 'SABIA' },
      }],
    });
  });

  it('troca professor por equipe central, limpa a unidade e confirma a leitura pós-commit', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-1',
        mantenedoraId: 'mant-1',
        email: 'maria@cocris.org.br',
        unitId: 'unit-a',
        roles: [{
          role: { type: RoleType.PROFESSOR, level: RoleLevel.PROFESSOR },
        }],
      })
      .mockResolvedValueOnce(adminRecord({
        unitId: null,
        unit: null,
        roles: [{
          scopeLevel: RoleLevel.STAFF_CENTRAL,
          role: {
            type: RoleType.STAFF_CENTRAL_PEDAGOGICO,
            level: RoleLevel.STAFF_CENTRAL,
          },
          unitScopes: [{ unitId: 'unit-a' }, { unitId: 'unit-b' }],
        }],
      }));
    tx.role.upsert.mockResolvedValue({
      id: 'role-central',
      level: RoleLevel.STAFF_CENTRAL,
    });
    tx.unit.findMany.mockResolvedValue([{ id: 'unit-a' }, { id: 'unit-b' }]);

    const result = await service.updateUser(developer, 'user-1', {
      roleType: RoleType.STAFF_CENTRAL_PEDAGOGICO,
      unitCode: '',
    });

    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unitId: null }),
      }),
    );
    expect(tx.userRoleUnitScope.deleteMany).toHaveBeenCalledWith({
      where: { userRoleId: { in: ['assignment-old'] } },
    });
    expect(tx.userRoleUnitScope.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          { userRoleId: 'assignment-new', unitId: 'unit-a' },
          { userRoleId: 'assignment-new', unitId: 'unit-b' },
        ],
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      persisted: true,
      user: {
        unitId: null,
        roles: [{ roleType: RoleType.STAFF_CENTRAL_PEDAGOGICO }],
      },
    });
  });

  it('sincroniza unidade do usuário e escopo do papel na mesma transação', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-1',
        mantenedoraId: 'mant-1',
        email: 'maria@cocris.org.br',
        unitId: 'unit-a',
        roles: [{
          role: { type: RoleType.PROFESSOR, level: RoleLevel.PROFESSOR },
        }],
      })
      .mockResolvedValueOnce(adminRecord({
        unitId: 'unit-b',
        unit: { name: 'CEPI Arara', code: 'ARARA' },
        roles: [{
          scopeLevel: RoleLevel.PROFESSOR,
          role: { type: RoleType.PROFESSOR, level: RoleLevel.PROFESSOR },
          unitScopes: [{ unitId: 'unit-b' }],
        }],
      }));
    prisma.unit.findFirst.mockResolvedValue({ id: 'unit-b' });
    tx.role.upsert.mockResolvedValue({
      id: 'role-professor',
      level: RoleLevel.PROFESSOR,
    });

    const result = await service.updateUser(developer, 'user-1', {
      roleType: RoleType.PROFESSOR,
      unitCode: 'ARARA',
    });

    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unitId: 'unit-b' }),
      }),
    );
    expect(tx.userRoleUnitScope.create).toHaveBeenCalledWith({
      data: { userRoleId: 'assignment-new', unitId: 'unit-b' },
    });
    expect(result.user.unit).toEqual({
      name: 'CEPI Arara',
      unitCode: 'ARARA',
    });
  });

  it('impede gestor local de editar usuário de outra unidade', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-2',
      mantenedoraId: 'mant-1',
      email: 'outra@cocris.org.br',
      unitId: 'unit-b',
      roles: [{
        role: { type: RoleType.PROFESSOR, level: RoleLevel.PROFESSOR },
      }],
    });

    await expect(
      service.updateUser(unitManager, 'user-2', { firstName: 'Novo' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('impede promoção para DEVELOPER por perfil inferior', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      mantenedoraId: 'mant-1',
      email: 'maria@cocris.org.br',
      unitId: 'unit-a',
      roles: [{
        role: { type: RoleType.PROFESSOR, level: RoleLevel.PROFESSOR },
      }],
    });
    prisma.unit.findUnique.mockResolvedValue({ mantenedoraId: 'mant-1' });

    await expect(
      service.updateUser(unitManager, 'user-1', {
        roleType: RoleType.DEVELOPER,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('impede gestor local de criar usuário com papel central', async () => {
    await expect(
      service.createUser(unitManager, {
        firstName: 'Nova',
        lastName: 'Gestora',
        email: 'nova@cocris.org.br',
        password: 'senha-segura',
        roleType: RoleType.STAFF_CENTRAL_PEDAGOGICO,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
