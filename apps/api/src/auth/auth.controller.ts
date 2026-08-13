import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
  }

  /**
   * GET /auth/me — Retorna os dados do usuário autenticado
   * Obrigatório para o frontend carregar o perfil após login
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  /**
   * PUT /auth/me — Atualiza dados pessoais (nome, telefone)
   */
  @UseGuards(JwtAuthGuard)
  @Put('me')
  @HttpCode(HttpStatus.OK)
  async updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() body: { firstName?: string; lastName?: string; phone?: string },
  ) {
    const updated = await this.prisma.user.update({
      where: { id: user.sub },
      data: {
        ...(body.firstName && { firstName: body.firstName.trim() }),
        ...(body.lastName && { lastName: body.lastName.trim() }),
        ...(body.phone !== undefined && { phone: body.phone.trim() || null }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        updatedAt: true,
      },
    });
    return { message: 'Dados atualizados com sucesso', user: updated };
  }

  /**
   * PUT /auth/me/email — Altera o e-mail do usuário (exige senha atual)
   */
  @UseGuards(JwtAuthGuard)
  @Put('me/email')
  @HttpCode(HttpStatus.OK)
  async updateEmail(
    @CurrentUser() user: JwtPayload,
    @Body() body: { email: string; currentPassword: string },
  ) {
    if (!body.email || !body.currentPassword) {
      throw new BadRequestException('E-mail e senha atual são obrigatórios');
    }

    const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub } });
    if (!dbUser) throw new NotFoundException('Usuário não encontrado');

    const passwordValid = await bcrypt.compare(body.currentPassword, dbUser.password);
    if (!passwordValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    const emailInUse = await this.prisma.user.findUnique({
      where: { email: body.email.toLowerCase().trim() },
    });
    if (emailInUse && emailInUse.id !== user.sub) {
      throw new BadRequestException('Este e-mail já está em uso por outro usuário');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.sub },
      data: { email: body.email.toLowerCase().trim(), emailVerified: false },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    return { message: 'E-mail atualizado com sucesso', user: updated };
  }

  /**
   * PUT /auth/me/password — Altera a senha do usuário
   */
  @UseGuards(JwtAuthGuard)
  @Put('me/password')
  @HttpCode(HttpStatus.OK)
  async updatePassword(
    @CurrentUser() user: JwtPayload,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (!body.currentPassword || !body.newPassword) {
      throw new BadRequestException('Senha atual e nova senha são obrigatórias');
    }

    if (body.newPassword.length < 6) {
      throw new BadRequestException('A nova senha deve ter pelo menos 6 caracteres');
    }

    const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub } });
    if (!dbUser) throw new NotFoundException('Usuário não encontrado');

    const passwordValid = await bcrypt.compare(body.currentPassword, dbUser.password);
    if (!passwordValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    const hashedPassword = await bcrypt.hash(body.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.sub },
      data: { password: hashedPassword },
    });

    return { message: 'Senha alterada com sucesso' };
  }
}
