import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Extrai o JWT de duas fontes, em ordem de prioridade:
 * 1. Cookie httpOnly "access_token".
 * 2. Header Authorization: Bearer <token>.
 */
function extractJwtFromCookieOrBearer(req: Request): string | null {
  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }

  const authHeader = req?.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const route = req?.url ?? 'desconhecida';
  const origin = (req?.headers?.origin ?? req?.headers?.host ?? 'desconhecida') as string;
  console.warn(`[Auth] Token ausente — rota: ${route} | origem: ${origin}`);
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractJwtFromCookieOrBearer,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: false,
    });
  }

  /**
   * Normaliza o contexto autenticado a partir do banco.
   * Esta é a garantia central do multi-tenant:
   * toda requisição protegida recebe request.user com mantenedoraId real e atual.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        status: true,
        mantenedoraId: true,
        unitId: true,
        roles: {
          where: { isActive: true },
          select: {
            roleId: true,
            role: {
              select: {
                level: true,
                type: true,
              },
            },
            unitScopes: {
              select: {
                unitId: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ATIVO') {
      throw new UnauthorizedException('Usuário inativo ou não encontrado');
    }

    if (!user.mantenedoraId) {
      throw new UnauthorizedException(
        'Usuário sem mantenedora vinculada. Acesso bloqueado por segurança.',
      );
    }

    return {
      sub: user.id,
      id: user.id,
      email: user.email,
      mantenedoraId: user.mantenedoraId,
      unitId: user.unitId || undefined,
      roles: user.roles.map((userRole) => ({
        roleId: userRole.roleId,
        level: userRole.role.level,
        type: userRole.role.type,
        unitScopes: userRole.unitScopes.map((scope) => scope.unitId),
      })),
    };
  }
}
