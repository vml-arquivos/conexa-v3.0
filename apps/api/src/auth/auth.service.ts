import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Realiza o login do usuário.
   * Regra central: todo usuário autenticado precisa carregar mantenedoraId.
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.findActiveUserWithAccessContextByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = this.buildJwtPayload(user);

    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mantenedoraId: user.mantenedoraId,
        unitId: user.unitId,
        roles: payload.roles,
      },
    };
  }

  /**
   * Renova o access token usando o refresh token.
   * Importante: não reutiliza cegamente o payload antigo.
   * Recarrega usuário, mantenedora, unidade e roles do banco para evitar token desatualizado.
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      const oldPayload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      const user = await this.findActiveUserWithAccessContextById(oldPayload.sub);

      if (!user) {
        throw new UnauthorizedException('Usuário inativo ou não encontrado');
      }

      const freshPayload = this.buildJwtPayload(user);
      const newAccessToken = await this.generateAccessToken(freshPayload);

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  private async findActiveUserWithAccessContextByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: this.userAccessContextInclude(),
    });

    if (!user || user.status !== 'ATIVO') {
      return null;
    }

    return user;
  }

  private async findActiveUserWithAccessContextById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: this.userAccessContextInclude(),
    });

    if (!user || user.status !== 'ATIVO') {
      return null;
    }

    return user;
  }

  private userAccessContextInclude() {
    return {
      roles: {
        where: { isActive: true },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
          unitScopes: {
            include: {
              unit: true,
            },
          },
        },
      },
    } as const;
  }

  private buildJwtPayload(user: any): JwtPayload {
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
      roles: user.roles.map((userRole: any) => ({
        roleId: userRole.roleId,
        level: userRole.role.level,
        type: userRole.role.type,
        unitScopes: userRole.unitScopes.map((scope: any) => scope.unitId),
      })),
    };
  }

  /**
   * Gera um access token JWT
   */
  private async generateAccessToken(payload: JwtPayload): Promise<string> {
    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    return this.jwtService.signAsync(payload as any, {
      secret,
      expiresIn: expiresIn as any,
    });
  }

  /**
   * Gera um refresh token JWT
   */
  private async generateRefreshToken(payload: JwtPayload): Promise<string> {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    return this.jwtService.signAsync(payload as any, {
      secret,
      expiresIn: expiresIn as any,
    });
  }

  /**
   * Utilitário para hash de senha (usado ao criar usuários)
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Utilitário para validar senha
   */
  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Retorna os dados do usuário autenticado — GET /auth/me
   * Utilizado pelo frontend para carregar o perfil após login.
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        cpf: true,
        status: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true,
        mantenedoraId: true,
        unitId: true,
        unit: { select: { id: true, name: true, code: true } },
      },
    });

    if (!user || user.status !== 'ATIVO') {
      throw new UnauthorizedException('Usuário não encontrado ou inativo');
    }

    if (!user.mantenedoraId) {
      throw new UnauthorizedException(
        'Usuário sem mantenedora vinculada. Acesso bloqueado por segurança.',
      );
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, isActive: true },
      include: {
        role: { select: { level: true, type: true } },
        unitScopes: { select: { unitId: true } },
      },
    });

    const rolesRich = userRoles.map((r) => ({
      roleId: r.roleId,
      level: r.role.level,
      type: r.role.type,
      unitScopes: r.unitScopes.map((s) => s.unitId),
    }));

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        nome: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        phone: user.phone ?? null,
        cpf: user.cpf ?? null,
        status: user.status,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        mantenedoraId: user.mantenedoraId,
        unitId: user.unitId,
        unit: user.unit ? { id: user.unit.id, name: user.unit.name, unitCode: user.unit.code } : null,
        roles: rolesRich,
      },
    };
  }
}
