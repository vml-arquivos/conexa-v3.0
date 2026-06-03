import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Extrai o JWT de duas fontes (em ordem de prioridade):
 * 1. Cookie httpOnly "access_token" (fluxo principal em HTTPS)
 * 2. Header Authorization: Bearer <token> (fallback para mobile / curl)
 * Elimina o log "[Auth] Missing session cookie" sem remover suporte a cookies.
 */
function extractJwtFromCookieOrBearer(req: Request): string | null {
  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }
  const authHeader = req?.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // Log mínimo: rota e origem, sem expor token
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

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Verificar se o usuário ainda existe e está ativo
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true },
    });

    if (!user || user.status !== 'ATIVO') {
      throw new UnauthorizedException('Usuário inativo ou não encontrado');
    }

    return payload;
  }
}
