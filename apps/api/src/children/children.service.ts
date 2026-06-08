import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Prisma, EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { FilterChildDto } from './dto/filter-child.dto';
import { canAccessUnit } from '../common/utils/can-access-unit';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const UPLOADS_ROOT_DIR = path.resolve(process.env.UPLOADS_DIR ?? 'uploads');
const CHILDREN_UPLOADS_DIR = path.join(UPLOADS_ROOT_DIR, 'children');
const CHILDREN_DOCUMENTS_DIR = path.join(CHILDREN_UPLOADS_DIR, 'documents');


type ChildAdministrativeJsonFieldName =
  | 'dadosResponsaveis'
  | 'documentosMatricula'
  | 'autorizadosRetirada'
  | 'transporteEscolar'
  | 'fichaAdministrativa';

type PrismaJsonWriteValue =
  | Prisma.InputJsonValue
  | Prisma.NullableJsonNullValueInput
  | undefined;

function toPrismaJson(value: unknown): PrismaJsonWriteValue {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeChildJsonFields(
  dto: Partial<Record<ChildAdministrativeJsonFieldName, unknown>>,
): Partial<Prisma.ChildUncheckedCreateInput & Prisma.ChildUncheckedUpdateInput> {
  return {
    dadosResponsaveis: toPrismaJson(dto.dadosResponsaveis),
    documentosMatricula: toPrismaJson(dto.documentosMatricula),
    autorizadosRetirada: toPrismaJson(dto.autorizadosRetirada),
    transporteEscolar: toPrismaJson(dto.transporteEscolar),
    fichaAdministrativa: toPrismaJson(dto.fichaAdministrativa),
  } as Partial<Prisma.ChildUncheckedCreateInput & Prisma.ChildUncheckedUpdateInput>;
}


function parseJsonRecord(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parseJsonRecord(parsed);
    } catch {
      return {};
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return {};
}

function parseJsonArray(value: unknown): any[] {
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parseJsonArray(parsed);
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

function firstPresent(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return undefined;
}

function omitUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as T;
}

function mergeJsonRecord(existing: unknown, incoming: unknown): Record<string, any> | undefined {
  if (incoming === undefined) return undefined;
  const current = parseJsonRecord(existing);
  const next = parseJsonRecord(incoming);
  return { ...current, ...next };
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['sim', 's', 'true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['não', 'nao', 'n', 'false', '0', 'no'].includes(normalized)) return false;
  }
  return Boolean(value);
}

function normalizeResponsavelAdministrativo(
  rawValue: unknown,
  options: {
    nome?: unknown;
    parentesco?: unknown;
    cpf?: unknown;
    telefone?: unknown;
    celularPlanilha?: unknown;
    endereco?: unknown;
    cep?: unknown;
    dadosGerais?: Record<string, any>;
    rawPlanilha?: Record<string, any>;
  },
): Record<string, any> {
  const raw = parseJsonRecord(rawValue);
  const gerais = options.dadosGerais ?? {};
  const planilha = options.rawPlanilha ?? {};

  return omitUndefined({
    ...raw,
    nome: firstPresent(raw.nome, raw.name, options.nome),
    parentesco: firstPresent(raw.parentesco, options.parentesco),
    cpf: firstPresent(raw.cpf, raw.documentoCpf, options.cpf),
    identidade: firstPresent(raw.identidade, raw.identidadeResp, raw.documento, planilha['IDENTIDADE RESP']),
    orgaoExpeditor: firstPresent(raw.orgaoExpeditor, raw.orgaoExpedidor, raw.orgao, planilha['ORG. EXPEDITOR']),
    dataDocumento: firstPresent(raw.dataDocumento, raw.data, planilha['DATA']),
    pis: firstPresent(raw.pis, raw.pisResponsavel, gerais.pisResponsavel),
    nascimento: firstPresent(raw.nascimento, raw.dataNascimento, planilha['NASCIMENTO']),
    telefoneTrabalho: firstPresent(raw.telefoneTrabalho, raw.telefoneComercial, planilha['TE. TRABALHO']),
    telefoneResidencial: firstPresent(raw.telefoneResidencial, raw.residencial, planilha['TEL. RESIDENCIAL']),
    celular: firstPresent(raw.celular, raw.telefone, raw.whatsapp, options.celularPlanilha, options.telefone),
    email: firstPresent(raw.email, raw.eMail, raw.mail),
    escolaridade: firstPresent(raw.escolaridade, gerais.escolaridade, planilha['ESCOLARIDADE']),
    profissao: firstPresent(raw.profissao, gerais.profissao, planilha['PROFISSÃO']),
    dependentes: firstPresent(raw.dependentes, raw.numeroDependentes, gerais.numeroDependentes, planilha['Nº DEPENDENTES']),
    endereco: firstPresent(raw.endereco, raw.endereço, options.endereco),
    cep: firstPresent(raw.cep, options.cep),
    beneficio: firstPresent(raw.beneficio, raw.benefício, gerais.beneficio, planilha['BENEFÍCIO'], planilha['BENEFICIO']),
    pessoasCasa: firstPresent(raw.pessoasCasa, raw.numeroPessoasCasa, raw.pessoasEmCasa, gerais.pessoasCasa, gerais.numeroPessoasCasa, gerais.numeroDependentes, planilha['Nº PESSOAS EM CASA'], planilha['Nº DEPENDENTES']),
  });
}

function normalizeAutorizadosRetirada(value: unknown): Array<Record<string, any>> {
  return parseJsonArray(value)
    .map((item) => {
      const autorizado = parseJsonRecord(item);
      return omitUndefined({
        ...autorizado,
        nome: firstPresent(autorizado.nome, autorizado.name),
        parentesco: firstPresent(autorizado.parentesco, autorizado.relacao, autorizado.relação),
        telefone: firstPresent(autorizado.telefone, autorizado.celular, autorizado.phone),
        documento: firstPresent(autorizado.documento, autorizado.cpf, autorizado.rg),
      });
    })
    .filter((item) => firstPresent(item.nome));
}

function normalizeTransporteEscolar(value: unknown): Record<string, any> {
  const transporte = parseJsonRecord(value);
  const utiliza =
    transporte.utiliza ??
    transporte.usaTransporteEscolar ??
    transporte.utilizaTransporteEscolar ??
    transporte.transporteEscolar;

  return omitUndefined({
    ...transporte,
    utiliza: normalizeBoolean(utiliza),
    nomeTransporte: firstPresent(transporte.nomeTransporte, transporte.empresa, transporte.empresaTransporte, transporte.nomeEmpresa),
  });
}

function normalizeDocumentosMatricula(value: unknown): Record<string, any> {
  return parseJsonRecord(value);
}

function normalizeFichaAdministrativa(value: unknown): Record<string, any> {
  const ficha = parseJsonRecord(value);
  const raw = parseJsonRecord(ficha.raw);
  return omitUndefined({
    ...ficha,
    serieAnterior: firstPresent(ficha.serieAnterior, ficha.turmaAnterior, raw['SÉRIE ANTERIOR'], raw['SERIE ANTERIOR']),
    observacoesSecretaria: firstPresent(ficha.observacoesSecretaria, ficha.observacoes, raw['OBSERVAÇÕES'], raw['OBSERVACOES']),
    altura: firstPresent(ficha.altura, raw['ALTURA']),
    intolerancias: firstPresent(ficha.intolerancias, ficha.intolerantes, raw['INTOLERANTES'], raw['INTOLERÂNCIAS'], raw['INTOLERANCIAS']),
    allergies: firstPresent(ficha.allergies, ficha.alergias, raw['ALERGIAS']),
    genitor: ficha.genitor,
  });
}

function normalizeChildAdministrativePayload<T extends Record<string, any>>(child: T): T {
  const dadosResponsaveis = parseJsonRecord(child.dadosResponsaveis);
  const documentosMatricula = normalizeDocumentosMatricula(child.documentosMatricula);
  const fichaAdministrativa = normalizeFichaAdministrativa(child.fichaAdministrativa);
  const rawPlanilha = parseJsonRecord(fichaAdministrativa.raw);
  const responsavelPrincipal = parseJsonRecord(
    dadosResponsaveis.responsavelLegal ?? dadosResponsaveis.responsavelPrincipal,
  );

  const normalizedDadosResponsaveis = {
    ...dadosResponsaveis,
    mae: normalizeResponsavelAdministrativo(dadosResponsaveis.mae, {
      nome: child.nomeMae ?? rawPlanilha['MÃE'],
      parentesco: 'MÃE',
      celularPlanilha: rawPlanilha['CEL. MÃE'],
      endereco: child.endereco,
      cep: child.cep,
      dadosGerais: dadosResponsaveis,
      rawPlanilha,
    }),
    pai: normalizeResponsavelAdministrativo(dadosResponsaveis.pai, {
      nome: child.nomePai ?? rawPlanilha['PAI'],
      parentesco: 'PAI',
      telefone: child.celPai,
      celularPlanilha: rawPlanilha['CEL. PAI'],
      endereco: child.endereco,
      cep: child.cep,
      dadosGerais: dadosResponsaveis,
      rawPlanilha,
    }),
    responsavelLegal: normalizeResponsavelAdministrativo(responsavelPrincipal, {
      nome: child.emergencyContactName ?? responsavelPrincipal.nome ?? rawPlanilha['RESPONSÁVEL'],
      parentesco: responsavelPrincipal.parentesco,
      cpf: responsavelPrincipal.cpf ?? documentosMatricula.cpfResponsavel,
      telefone: child.emergencyContactPhone ?? responsavelPrincipal.telefone,
      celularPlanilha: responsavelPrincipal.telefone,
      endereco: child.endereco,
      cep: child.cep,
      dadosGerais: dadosResponsaveis,
      rawPlanilha,
    }),
  };

  return {
    ...child,
    dadosResponsaveis: normalizedDadosResponsaveis,
    documentosMatricula,
    autorizadosRetirada: normalizeAutorizadosRetirada(child.autorizadosRetirada),
    transporteEscolar: normalizeTransporteEscolar(child.transporteEscolar),
    fichaAdministrativa,
  };
}

@Injectable()
export class ChildrenService {
  constructor(private prisma: PrismaService) {}

  /**
   * Criar nova criança
   */
  async create(createChildDto: CreateChildDto, user: any) {
    // Verificar acesso à unidade
    if (!(await canAccessUnit(user, createChildDto.unitId))) {
      throw new ForbiddenException('Você não tem acesso a esta unidade');
    }

    const {
      dadosResponsaveis,
      documentosMatricula,
      autorizadosRetirada,
      transporteEscolar,
      fichaAdministrativa,
      ...childBaseDto
    } = createChildDto;

    const data: Prisma.ChildUncheckedCreateInput = {
      ...childBaseDto,
      mantenedoraId: user.mantenedoraId,
      ...normalizeChildJsonFields({
        dadosResponsaveis,
        documentosMatricula,
        autorizadosRetirada,
        transporteEscolar,
        fichaAdministrativa,
      }),
    };

    const child = await this.prisma.child.create({
      data,
      include: {
        unit: true,
      },
    });

    return normalizeChildAdministrativePayload(child);
  }

  /**
   * Listar crianças com filtros
   */
  async findAll(filters: FilterChildDto, user: any) {
    const where: any = {
      mantenedoraId: user.mantenedoraId,
    };

    // Filtro por unidade
    if (filters.unitId) {
      if (!(await canAccessUnit(user, filters.unitId))) {
        throw new ForbiddenException('Você não tem acesso a esta unidade');
      }
      where.unitId = filters.unitId;
    } else {
      // UNIDADE e PROFESSOR: restringir à própria unidade
      const isUnitOrProfessor = user.roles?.some(
        (r: any) => r.level === 'UNIDADE' || r.level === 'PROFESSOR'
      );
      if (isUnitOrProfessor && user.unitId) {
        where.unitId = user.unitId;
      }
      // STAFF_CENTRAL: filtrar por unitScopes se definido
      const isStaffCentral = user.roles?.some((r: any) => r.level === 'STAFF_CENTRAL');
      if (isStaffCentral) {
        const scopes = user.roles?.find((r: any) => r.level === 'STAFF_CENTRAL')?.unitScopes ?? [];
        if (scopes.length > 0) {
          where.unitId = { in: scopes };
        }
        // sem scopes: acessa todos da mantenedora — where.mantenedoraId já filtra
      }
      // MANTENEDORA/DEVELOPER: where.mantenedoraId já é suficiente
    }

    // Filtro por status
    if (filters.status) {
      where.enrollments = {
        some: {
          status: filters.status,
        },
      };
    }

    // Filtro por busca (nome ou CPF)
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { cpf: { contains: filters.search } },
      ];
    }

    const children = await this.prisma.child.findMany({
      where,
      include: {
        unit: true,
        enrollments: {
          where: { status: 'ATIVA' },
          include: {
            classroom: true,
          },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    return children.map((child) => normalizeChildAdministrativePayload(child));
  }

  /**
   * Buscar criança por ID
   */
  async findOne(id: string, user: any) {
    const child = await this.prisma.child.findUnique({
      where: { id },
      include: {
        unit: true,
        enrollments: {
          include: {
            classroom: true,
          },
        },
        dietaryRestrictions: true,
      },
    });

    if (!child) {
      throw new NotFoundException('Criança não encontrada');
    }

    if (child.mantenedoraId !== user.mantenedoraId) {
      throw new ForbiddenException('Você não tem acesso a esta criança');
    }

    if (!(await canAccessUnit(user, child.unitId))) {
      throw new ForbiddenException('Você não tem acesso a esta unidade');
    }

    return normalizeChildAdministrativePayload(child);
  }

  /**
   * Atualizar criança
   */
  async update(id: string, updateChildDto: UpdateChildDto, user: any) {
    const child = await this.findOne(id, user);

    const {
      dadosResponsaveis,
      documentosMatricula,
      autorizadosRetirada,
      transporteEscolar,
      fichaAdministrativa,
      ...childBaseUpdateDto
    } = updateChildDto;

    const data: Prisma.ChildUncheckedUpdateInput = {
      ...childBaseUpdateDto,
      ...normalizeChildJsonFields({
        dadosResponsaveis: mergeJsonRecord(child.dadosResponsaveis, dadosResponsaveis),
        documentosMatricula: mergeJsonRecord(child.documentosMatricula, documentosMatricula),
        autorizadosRetirada: autorizadosRetirada === undefined ? undefined : autorizadosRetirada,
        transporteEscolar: mergeJsonRecord(child.transporteEscolar, transporteEscolar),
        fichaAdministrativa: mergeJsonRecord(child.fichaAdministrativa, fichaAdministrativa),
      }),
    };

    const updated = await this.prisma.child.update({
      where: { id },
      data,
      include: {
        unit: true,
        enrollments: {
          include: {
            classroom: true,
          },
        },
      },
    });

    return normalizeChildAdministrativePayload(updated);
  }

  /**
   * Deletar criança (soft delete)
   */
  async remove(id: string, user: any) {
    const child = await this.findOne(id, user);

    // Inativar todas as matrículas
    await this.prisma.enrollment.updateMany({
      where: { childId: id },
      data: { status: 'CANCELADA' },
    });

    return { message: 'Criança removida com sucesso' };
  }

  /**
   * Upload de foto da criança
   */
  async uploadPhoto(id: string, file: Express.Multer.File, user: any) {
    const child = await this.prisma.child.findFirst({
      where: {
        id,
        mantenedoraId: user.mantenedoraId,
      },
      select: {
        id: true,
        unitId: true,
        photoUrl: true,
      },
    });

    if (!child) {
      throw new NotFoundException('Criança não encontrada');
    }

    if (!(await canAccessUnit(user, child.unitId))) {
      throw new ForbiddenException('Você não tem acesso a esta unidade');
    }

    if (!file?.buffer) {
      throw new BadRequestException('Arquivo não recebido');
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.');
    }

    fs.mkdirSync(CHILDREN_UPLOADS_DIR, { recursive: true });

    if (child.photoUrl?.startsWith('/uploads/children/')) {
      const oldRelativePath = child.photoUrl.replace(/^\/uploads\//, '');
      const oldFilePath = path.join(UPLOADS_ROOT_DIR, oldRelativePath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    const ext = file.mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const filename = `${id}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const filepath = path.join(CHILDREN_UPLOADS_DIR, filename);
    const photoUrl = `/uploads/children/${filename}`;

    fs.writeFileSync(filepath, file.buffer);

    try {
      await this.prisma.child.update({
        where: { id },
        data: { photoUrl },
      });
    } catch (error: any) {
      const message = String(error?.message ?? '');
      const missingPhotoUrlColumn =
        message.includes('photoUrl')
        && (
          message.toLowerCase().includes('column')
          || message.toLowerCase().includes('does not exist')
          || message.toLowerCase().includes('unknown arg')
        );

      if (!missingPhotoUrlColumn) {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        throw new InternalServerErrorException('Não foi possível salvar a foto da criança');
      }

      await this.prisma.$executeRawUnsafe(
        'ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT',
      );

      await this.prisma.child.update({
        where: { id },
        data: { photoUrl },
      });
    }

    return { photoUrl, message: 'Foto atualizada com sucesso' };
  }


  /**
   * Upload de documento/anexo da matrícula da criança.
   * O arquivo é salvo em /uploads/children/documents e o vínculo fica no JSON documentosMatricula,
   * preservando o checklist existente e sem exigir nova tabela para anexos.
   */
  async uploadDocument(id: string, type: string, file: Express.Multer.File, user: any) {
    const child = await this.prisma.child.findFirst({
      where: {
        id,
        mantenedoraId: user.mantenedoraId,
      },
      select: {
        id: true,
        unitId: true,
        documentosMatricula: true,
      },
    });

    if (!child) {
      throw new NotFoundException('Criança não encontrada');
    }

    if (!(await canAccessUnit(user, child.unitId))) {
      throw new ForbiddenException('Você não tem acesso a esta unidade');
    }

    if (!file?.buffer) {
      throw new BadRequestException('Arquivo não recebido');
    }

    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de documento não permitido. Use imagem, PDF, DOC ou DOCX.');
    }

    const documentType = (type || 'outros')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 60) || 'outros';

    fs.mkdirSync(CHILDREN_DOCUMENTS_DIR, { recursive: true });

    const originalExt = path.extname(file.originalname || '').toLowerCase();
    const fallbackExt = file.mimetype === 'application/pdf' ? '.pdf' : `.${file.mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'bin'}`;
    const ext = originalExt || fallbackExt;
    const filename = `${id}-${documentType}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const filepath = path.join(CHILDREN_DOCUMENTS_DIR, filename);
    const url = `/uploads/children/documents/${filename}`;

    fs.writeFileSync(filepath, file.buffer);

    const currentDocs =
      child.documentosMatricula && typeof child.documentosMatricula === 'object' && !Array.isArray(child.documentosMatricula)
        ? (child.documentosMatricula as Record<string, any>)
        : {};
    const currentAnexos =
      currentDocs.anexos && typeof currentDocs.anexos === 'object' && !Array.isArray(currentDocs.anexos)
        ? (currentDocs.anexos as Record<string, any[]>)
        : {};

    const documento = {
      nome: file.originalname || filename,
      url,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    const documentosMatricula = {
      ...currentDocs,
      [documentType]: true,
      anexos: {
        ...currentAnexos,
        [documentType]: [...(currentAnexos[documentType] ?? []), documento],
      },
    };

    try {
      await this.prisma.child.update({
        where: { id },
        data: { documentosMatricula: toPrismaJson(documentosMatricula) },
      });
    } catch (error) {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      throw error;
    }

    return { documento, documentosMatricula, message: 'Documento anexado com sucesso' };
  }

  /**
   * Criar matrícula para criança
   */
  async createEnrollment(id: string, enrollmentData: any, user: any) {
    const child = await this.findOne(id, user);

    const enrollment = await this.prisma.enrollment.create({
      data: {
        childId: id,
        classroomId: enrollmentData.classroomId,
        status: 'ATIVA',
        enrollmentDate: new Date(enrollmentData.enrollmentDate),
        withdrawalDate: enrollmentData.withdrawalDate ? new Date(enrollmentData.withdrawalDate) : null,
      },
      include: {
        classroom: true,
      },
    });

    return enrollment;
  }


  /**
   * Criar ou atualizar a matrícula ativa da criança sem duplicar registros.
   */
  async upsertActiveEnrollment(id: string, enrollmentData: any, user: any) {
    await this.findOne(id, user);

    const enrollmentId = enrollmentData?.enrollmentId;
    const classroomId = enrollmentData?.classroomId;
    const enrollmentDate = enrollmentData?.enrollmentDate;

    const existing = enrollmentId
      ? await this.prisma.enrollment.findFirst({ where: { id: enrollmentId, childId: id } })
      : await this.prisma.enrollment.findFirst({
          where: { childId: id, status: EnrollmentStatus.ATIVA },
          orderBy: { enrollmentDate: 'desc' },
        });

    if (existing) {
      return this.prisma.enrollment.update({
        where: { id: existing.id },
        data: {
          ...(classroomId ? { classroomId } : {}),
          ...(enrollmentDate ? { enrollmentDate: new Date(enrollmentDate) } : {}),
          status: EnrollmentStatus.ATIVA,
          updatedBy: user.sub ?? user.id ?? null,
        },
        include: { classroom: true },
      });
    }

    if (!classroomId) {
      return null;
    }

    return this.prisma.enrollment.create({
      data: {
        childId: id,
        classroomId,
        status: EnrollmentStatus.ATIVA,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
      },
      include: { classroom: true },
    });
  }

  /**
   * Atualizar status de matrícula sem exclusão.
   * Aceita apenas CANCELADA ou TRANSFERIDA e preserva o escopo do usuário.
   */
  async updateEnrollment(id: string, enrollmentId: string, enrollmentData: any, user: any) {
    const receivedKeys = Object.keys(enrollmentData ?? {}).filter(
      (key) => enrollmentData[key] !== undefined,
    );
    if (receivedKeys.length !== 1 || receivedKeys[0] !== 'status') {
      throw new BadRequestException('Apenas o campo status pode ser atualizado nesta operação');
    }

    const status = enrollmentData.status as EnrollmentStatus;
    if (status !== EnrollmentStatus.CANCELADA && status !== EnrollmentStatus.TRANSFERIDA) {
      throw new BadRequestException('Status permitido apenas para CANCELADA ou TRANSFERIDA');
    }

    const child = await this.prisma.child.findFirst({
      where: {
        id,
        mantenedoraId: user.mantenedoraId,
      },
      select: {
        id: true,
        unitId: true,
        mantenedoraId: true,
      },
    });

    if (!child) {
      throw new NotFoundException('Criança não encontrada');
    }

    if (!(await canAccessUnit(user, child.unitId))) {
      throw new ForbiddenException('Você não tem acesso a esta unidade');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        childId: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Matrícula não encontrada');
    }

    if (enrollment.childId !== child.id) {
      throw new BadRequestException('Matrícula não pertence à criança informada');
    }

    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status,
        ...(status === EnrollmentStatus.CANCELADA ? { withdrawalDate: new Date() } : {}),
        updatedBy: user.sub ?? user.id ?? null,
      },
      include: {
        classroom: true,
      },
    });
  }

  /**
   * Listar matrículas da criança
   */
  async getEnrollments(id: string, user: any) {
    const child = await this.findOne(id, user);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { childId: id },
      include: {
        classroom: true,
      },
      orderBy: { enrollmentDate: 'desc' },
    });

    return enrollments;
  }

  /**
   * Adicionar restrição alimentar
   * Após criar, gera AlertaOperacional + Notificações para nutricionista e coordenação
   */
  async addDietaryRestriction(id: string, restrictionData: any, user: any) {
    const child = await this.findOne(id, user);

    const restriction = await this.prisma.dietaryRestriction.create({
      data: {
        childId: id,
        type: restrictionData.type,
        name: restrictionData.name,
        description: restrictionData.description ?? null,
        severity: restrictionData.severity || 'leve',
        allowedFoods: restrictionData.allowedFoods ?? null,
        forbiddenFoods: restrictionData.forbiddenFoods ?? null,
        createdBy: user.sub,
      },
    });

    // ─── Gerar alerta operacional + notificações para nutricionista e coordenação ───
    try {
      const nomeCompleto = `${child.firstName} ${child.lastName}`;
      const severidade =
        restrictionData.severity === 'severa' ? 'ALTA'
        : restrictionData.severity === 'moderada' ? 'MEDIA'
        : 'BAIXA';

      const alerta = await this.prisma.alertaOperacional.create({
        data: {
          mantenedoraId: child.mantenedoraId,
          unitId: child.unitId,
          childId: id,
          tipo: 'OUTRO',
          severidade: severidade as any,
          titulo: `Restrição alimentar registrada: ${nomeCompleto}`,
          descricao:
            `Tipo: ${restrictionData.type} | Restrição: ${restrictionData.name}` +
            (restrictionData.description ? ` | Obs: ${restrictionData.description}` : '') +
            (restrictionData.forbiddenFoods ? ` | Proibidos: ${restrictionData.forbiddenFoods}` : ''),
          metadados: {
            childId: id,
            childName: nomeCompleto,
            restrictionType: restrictionData.type,
            restrictionName: restrictionData.name,
            severity: restrictionData.severity || 'leve',
            forbiddenFoods: restrictionData.forbiddenFoods ?? null,
            allowedFoods: restrictionData.allowedFoods ?? null,
          },
        },
      });

      // Buscar nutricionistas e coordenadores da unidade para notificar
      const destinatarios = await this.prisma.user.findMany({
        where: {
          unitId: child.unitId,
          roles: {
            some: {
              role: {
                type: {
                  in: [
                    'UNIDADE_NUTRICIONISTA',
                    'UNIDADE_COORDENADOR_PEDAGOGICO',
                    'UNIDADE_DIRETOR',
                  ] as any,
                },
              },
            },
          },
        },
        select: { id: true },
      });

      if (destinatarios.length > 0) {
        await this.prisma.notificacao.createMany({
          data: destinatarios.map((u) => ({
            usuarioId: u.id,
            alertaId: alerta.id,
            titulo: `⚠️ Restrição alimentar: ${nomeCompleto}`,
            mensagem:
              `${restrictionData.type === 'ALERGIA' ? 'ALERGIA' : 'Restrição'} registrada para ${nomeCompleto}: ${restrictionData.name}.` +
              (restrictionData.forbiddenFoods
                ? ` Alimentos proibidos: ${restrictionData.forbiddenFoods}.`
                : '') +
              ' Verifique o cardápio e tome as providências necessárias.',
            link: `/app/coordenacao-pedagogica`,
          })),
        });
      }
    } catch (e) {
      // Não bloqueia o fluxo principal se a notificação falhar
      console.warn('[DietaryRestriction] Falha ao criar alerta/notificação:', e);
    }

    return restriction;
  }

  /**
   * Listar restrições alimentares da criança
   */
  async getDietaryRestrictions(id: string, user: any) {
    const child = await this.findOne(id, user);

    const restrictions = await this.prisma.dietaryRestriction.findMany({
      where: { childId: id },
    });

    return restrictions;
  }

  /**
   * Buscar todas as restrições alimentares ativas de uma unidade (para nutricionista)
   */
  async getAllDietaryRestrictionsByUnit(user: any, unitId?: string) {
    let targetUnitId = unitId || user.unitId;

    // Professores podem não ter unitId no token — resolver via classroomTeacher ou primeira unidade da mantenedora
    if (!targetUnitId) {
      const isProfessor = user.roles?.some(
        (r: any) => r.level === 'PROFESSOR'
      );
      if (isProfessor) {
        // Tentativa 1: classroomTeacher ativo
        const ct = await this.prisma.classroomTeacher.findFirst({
          where: { teacherId: user.sub, isActive: true },
          include: { classroom: { select: { unitId: true } } },
        });
        if (ct?.classroom?.unitId) {
          targetUnitId = ct.classroom.unitId;
        } else {
          // Tentativa 2: primeira unidade ativa da mantenedora (professor sem vínculo formal)
          const firstUnit = await this.prisma.unit.findFirst({
            where: { mantenedoraId: user.mantenedoraId, isActive: true },
            select: { id: true },
            orderBy: { name: 'asc' },
          });
          if (firstUnit) targetUnitId = firstUnit.id;
        }
      }
    }

    // Se ainda não resolveu, retornar lista vazia em vez de erro (professor sem unidade)
    if (!targetUnitId) {
      return [];
    }
    const restrictions = await this.prisma.dietaryRestriction.findMany({
      where: {
        isActive: true,
        child: {
          mantenedoraId: user.mantenedoraId,
          unitId: targetUnitId,
        },
      },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            enrollments: {
              where: { status: 'ATIVA' },
              include: { classroom: { select: { id: true, name: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: [
        { child: { firstName: 'asc' } },
      ],
    });
    return restrictions;
  }

  /**
   * Dashboard consolidado de saúde: alergias, dietas, condições médicas, medicamentos
   * Retorna crianças com qualquer informação de saúde relevante em 1 query (sem N+1)
   */
  async getHealthDashboard(user: any, unitId?: string, classroomId?: string) {
    let targetUnitId = unitId || user.unitId;

    // Professores podem não ter unitId no token — resolver via classroomTeacher
    if (!targetUnitId) {
      const isProfessor = user.roles?.some((r: any) => r.level === 'PROFESSOR');
      if (isProfessor) {
        const ct = await this.prisma.classroomTeacher.findFirst({
          where: { teacherId: user.sub, isActive: true },
          include: { classroom: { select: { unitId: true } } },
        });
        if (ct?.classroom?.unitId) {
          targetUnitId = ct.classroom.unitId;
        } else {
          const firstUnit = await this.prisma.unit.findFirst({
            where: { mantenedoraId: user.mantenedoraId, isActive: true },
            select: { id: true },
            orderBy: { name: 'asc' },
          });
          if (firstUnit) targetUnitId = firstUnit.id;
        }
      }
    }

    if (!targetUnitId) {
      return { children: [], stats: { total: 0, comAlergia: 0, comDieta: 0, comCondicaoMedica: 0, comMedicamento: 0, casosCriticos: 0 } };
    }

    // Filtro de turma opcional
    const enrollmentFilter: any = { status: 'ATIVA' };
    if (classroomId) enrollmentFilter.classroomId = classroomId;

    // FIX: retornar TODAS as crianças matriculadas (não só as com restrição)
    // Isso garante que o painel da nutricionista mostre total correto de alunos
    const children = await this.prisma.child.findMany({
      where: {
        mantenedoraId: user.mantenedoraId,
        unitId: targetUnitId,
        isActive: true,
        // Filtro de turma via enrollment (obrigatório quando classroomId fornecido)
        ...(classroomId ? {
          enrollments: { some: { classroomId, status: 'ATIVA' } },
        } : {
          // Sem turma: retornar apenas crianças com informação de saúde (visão geral)
          OR: [
            { allergies: { not: null } },
            { medicalConditions: { not: null } },
            { medicationNeeds: { not: null } },
            { dietaryRestrictions: { some: { isActive: true } } },
          ],
        }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        photoUrl: true,
        bloodType: true,
        allergies: true,
        medicalConditions: true,
        medicationNeeds: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        enrollments: {
          where: enrollmentFilter,
          select: {
            classroom: { select: { id: true, name: true } },
          },
          take: 1,
        },
        dietaryRestrictions: {
          where: { isActive: true },
          select: {
            id: true,
            type: true,
            name: true,
            description: true,
            severity: true,
            allowedFoods: true,
            forbiddenFoods: true,
          },
          orderBy: { severity: 'asc' },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    // Calcular estatísticas
    const comRestricao = children.filter(c =>
      c.dietaryRestrictions.length > 0 || !!c.allergies || !!c.medicalConditions
    ).length;
    const stats = {
      total: children.length,
      totalMatriculados: children.length,
      comRestricao,
      comAlergia: children.filter(c => c.allergies || c.dietaryRestrictions.some(r => r.type === 'ALERGIA')).length,
      comDieta: children.filter(c => c.dietaryRestrictions.some(r => r.type !== 'ALERGIA')).length,
      comCondicaoMedica: children.filter(c => !!c.medicalConditions).length,
      comMedicamento: children.filter(c => !!c.medicationNeeds).length,
      casosCriticos: children.filter(c =>
        c.dietaryRestrictions.some(r => r.severity === 'severa') ||
        (c.allergies && c.allergies.toLowerCase().includes('severa'))
      ).length,
    };

    return { children, stats };
  }

  /**
   * Buscar histórico de saúde da criança
   */
  async getHealthHistory(id: string, user: any) {
    const child = await this.findOne(id, user);

    // Buscar eventos de diário relacionados à saúde
    const healthEvents = await this.prisma.diaryEvent.findMany({
      where: {
        childId: id,
        type: 'SAUDE',
      },
      orderBy: { eventDate: 'desc' },
      take: 50,
    });

    return healthEvents;
  }
}
