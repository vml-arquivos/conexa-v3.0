import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

function hasOnlyTeacherLevel(user: JwtPayload): boolean {
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const levels = roles.map((r: any) => r?.level);
  const hasBroaderAccess = levels.some((l) =>
    ([RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER] as RoleLevel[]).includes(l),
  );
  return !hasBroaderAccess && levels.includes(RoleLevel.PROFESSOR);
}

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

    // Mesma correção do vazamento de leitura: professor só pode criar
    // registro de fotos em turma onde tem vínculo ativo — sem isso, um
    // professor poderia registrar atividades em turma de outro colega.
    if (hasOnlyTeacherLevel(user)) {
      const vinculo = await this.prisma.classroomTeacher.findFirst({
        where: { teacherId: user.sub, classroomId: dto.classroomId, isActive: true },
        select: { id: true },
      });
      if (!vinculo) throw new ForbiddenException('Professor sem vínculo com esta turma');
    }

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

    // CORREÇÃO CRÍTICA — vazamento de dados entre professores: o filtro
    // anterior só restringia por mantenedoraId/unitId (a escola inteira),
    // nunca por turma. Como classroomId chega vazio quando o frontend não
    // envia o parâmetro, qualquer professor recebia os registros de fotos
    // de TODAS as turmas da unidade, inclusive de colegas. Agora, quando o
    // usuário só tem nível PROFESSOR (sem UNIDADE/STAFF_CENTRAL/MANTENEDORA),
    // a consulta é restrita às turmas em que ele está efetivamente vinculado
    // via ClassroomTeacher — mesmo padrão já usado em insights.service.ts.
    if (hasOnlyTeacherLevel(user) && !classroomId) {
      const vinculos = await this.prisma.classroomTeacher.findMany({
        where: { teacherId: user.sub, isActive: true },
        select: { classroomId: true },
      });
      const classroomIds = vinculos.map((v) => v.classroomId);
      // Sem turma vinculada, não deve ver nenhum registro de outra turma.
      where.classroomId = { in: classroomIds.length > 0 ? classroomIds : ['__nenhuma_turma__'] };
    }

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
    // Mesma correção do vazamento em listar(): valida também a unidade e,
    // quando o usuário é só professor, exige vínculo ativo com a turma
    // do relatório — sem isso, o ID de um relatório de outra turma da
    // mesma rede ainda seria acessível diretamente por URL/query.
    if (user.unitId && relatorio.unitId !== user.unitId) {
      throw new ForbiddenException('Fora do escopo');
    }
    if (hasOnlyTeacherLevel(user)) {
      const vinculo = await this.prisma.classroomTeacher.findFirst({
        where: { teacherId: user.sub, classroomId: relatorio.classroomId, isActive: true },
        select: { id: true },
      });
      if (!vinculo) throw new ForbiddenException('Professor sem vínculo com a turma deste relatório');
    }
    return this.parseRelatorio(relatorio);
  }

  /**
   * Publicar relatório
   */
  async publicar(id: string, user: JwtPayload) {
    const relatorio = await this.prisma.relatorioFoto.findUnique({ where: { id } });
    if (!relatorio) throw new NotFoundException('Relatório não encontrado');
    if (relatorio.mantenedoraId !== user.mantenedoraId) throw new ForbiddenException('Fora do escopo');
    if (hasOnlyTeacherLevel(user)) {
      const vinculo = await this.prisma.classroomTeacher.findFirst({
        where: { teacherId: user.sub, classroomId: relatorio.classroomId, isActive: true },
        select: { id: true },
      });
      if (!vinculo) throw new ForbiddenException('Professor sem vínculo com a turma deste relatório');
    }

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
    if (hasOnlyTeacherLevel(user)) {
      const vinculo = await this.prisma.classroomTeacher.findFirst({
        where: { teacherId: user.sub, classroomId: relatorio.classroomId, isActive: true },
        select: { id: true },
      });
      if (!vinculo) throw new ForbiddenException('Professor sem vínculo com a turma deste relatório');
    }

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
