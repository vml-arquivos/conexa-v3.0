import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class RdxService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criar novo relatório de fotos
   * dto: { classroomId, titulo, descricao, dataAtividade, fotos?: [{url, legenda, campoExperiencia, criancas?}] }
   */
  async criar(dto: any, user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) {
      throw new ForbiddenException('Escopo inválido');
    }
    if (!dto.classroomId || !dto.titulo || !dto.dataAtividade) {
      throw new BadRequestException('classroomId, titulo e dataAtividade são obrigatórios');
    }

    // Verificar se a turma pertence à unidade do usuário
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: dto.classroomId, unitId: user.unitId },
    });
    if (!classroom) throw new NotFoundException('Turma não encontrada ou fora do escopo');

    // Criar o relatório com fotos como JSON no campo descricao (estrutura flexível)
    const fotosJson = dto.fotos ? JSON.stringify(dto.fotos) : null;

    const relatorio = await this.prisma.relatorioFoto.create({
      data: {
        mantenedoraId: user.mantenedoraId,
        unitId: user.unitId,
        classroomId: dto.classroomId,
        titulo: dto.titulo,
        descricao: dto.descricao ? `${dto.descricao}${fotosJson ? `\n__FOTOS__:${fotosJson}` : ''}` : fotosJson ? `__FOTOS__:${fotosJson}` : null,
        dataAtividade: new Date(dto.dataAtividade),
        criadoPorId: user.sub,
        publicado: false,
      },
    });

    return {
      ...relatorio,
      fotos: dto.fotos ?? [],
    };
  }

  /**
   * Listar relatórios de fotos
   */
  async listar(classroomId: string, publicado: boolean | undefined, user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');

    const where: any = { mantenedoraId: user.mantenedoraId };

    // Professores veem apenas da sua unidade
    if (user.unitId) where.unitId = user.unitId;
    if (classroomId) where.classroomId = classroomId;
    if (publicado !== undefined) where.publicado = publicado;

    const relatorios = await this.prisma.relatorioFoto.findMany({
      where,
      include: {
        mantenedora: { select: { name: true } },
      },
      orderBy: { dataAtividade: 'desc' },
      take: 100,
    });

    return relatorios.map((r) => this.parseRelatorio(r));
  }

  /**
   * Detalhe de um relatório
   */
  async getById(id: string, user: JwtPayload) {
    const relatorio = await this.prisma.relatorioFoto.findUnique({ where: { id } });
    if (!relatorio) throw new NotFoundException('Relatório não encontrado');
    if (relatorio.mantenedoraId !== user.mantenedoraId) throw new ForbiddenException('Fora do escopo');
    return this.parseRelatorio(relatorio);
  }

  /**
   * Publicar relatório
   */
  async publicar(id: string, user: JwtPayload) {
    const relatorio = await this.prisma.relatorioFoto.findUnique({ where: { id } });
    if (!relatorio) throw new NotFoundException('Relatório não encontrado');
    if (relatorio.mantenedoraId !== user.mantenedoraId) throw new ForbiddenException('Fora do escopo');

    return this.prisma.relatorioFoto.update({
      where: { id },
      data: { publicado: true, publicadoEm: new Date() },
    });
  }

  /**
   * Adicionar fotos ao relatório
   * dto: { fotos: [{url, legenda, campoExperiencia, criancas?}] }
   */
  async adicionarFotos(id: string, dto: any, user: JwtPayload) {
    const relatorio = await this.prisma.relatorioFoto.findUnique({ where: { id } });
    if (!relatorio) throw new NotFoundException('Relatório não encontrado');
    if (relatorio.mantenedoraId !== user.mantenedoraId) throw new ForbiddenException('Fora do escopo');

    const parsed = this.parseRelatorio(relatorio);
    const fotosExistentes = parsed.fotos ?? [];
    const novasFotos = [...fotosExistentes, ...(dto.fotos ?? [])];

    const descricaoBase = relatorio.descricao?.split('\n__FOTOS__:')[0] ?? '';
    const novaDescricao = descricaoBase
      ? `${descricaoBase}\n__FOTOS__:${JSON.stringify(novasFotos)}`
      : `__FOTOS__:${JSON.stringify(novasFotos)}`;

    const atualizado = await this.prisma.relatorioFoto.update({
      where: { id },
      data: { descricao: novaDescricao },
    });

    return { ...atualizado, fotos: novasFotos };
  }

  /**
   * Helper: parse fotos do campo descricao
   */
  private parseRelatorio(r: any) {
    let descricao = r.descricao ?? '';
    let fotos: any[] = [];

    if (descricao.includes('__FOTOS__:')) {
      const parts = descricao.split('\n__FOTOS__:');
      descricao = parts[0];
      try {
        fotos = JSON.parse(parts[1]);
      } catch {
        fotos = [];
      }
    }

    return { ...r, descricao: descricao || null, fotos };
  }
}
