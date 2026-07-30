import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleLevel, RoleType, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService — refresh usa dados persistidos atuais', () => {
  it('substitui unidade, e-mail e papéis antigos pelos valores atuais do banco', async () => {
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'user-1',
        email: 'antigo@cocris.org.br',
        mantenedoraId: 'mant-1',
        unitId: 'unit-antiga',
        roles: [],
      }),
      signAsync: jest.fn().mockResolvedValue('novo-access-token'),
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'atual@cocris.org.br',
          status: UserStatus.ATIVO,
          mantenedoraId: 'mant-1',
          unitId: 'unit-nova',
        }),
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([{
          roleId: 'role-1',
          role: {
            level: RoleLevel.UNIDADE,
            type: RoleType.UNIDADE_DIRETOR,
          },
          unitScopes: [{ unitId: 'unit-nova' }],
        }]),
      },
    };
    const config = {
      get: jest.fn((key: string) => ({
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_SECRET: 'access-secret',
        JWT_EXPIRES_IN: '15m',
      })[key]),
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );

    const result = await service.refreshAccessToken('refresh-token');

    expect(result).toEqual({ accessToken: 'novo-access-token' });
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'atual@cocris.org.br',
        unitId: 'unit-nova',
        roles: [{
          roleId: 'role-1',
          level: RoleLevel.UNIDADE,
          type: RoleType.UNIDADE_DIRETOR,
          unitScopes: ['unit-nova'],
        }],
      }),
      expect.any(Object),
    );
  });
});
