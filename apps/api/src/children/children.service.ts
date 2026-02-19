import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { FilterChildDto } from './dto/filter-child.dto';
import { canAccessUnit } from '../common/utils/can-access-unit';

@Injectable()
export class ChildrenService {
  constructor(private prisma: PrismaService) {}

  /**
   * Criar nova criança
   */
  async create(createChildDto: CreateChildDto, user: any) {
    // Verificar acesso à unidade
    if (!canAccessUnit(user, createChildDto.unitId)) {
      throw new ForbiddenException('Você não tem acesso a esta unidade');
    }

    const child = await this.prisma.child.create({
      data: {
        ...createChildDto,
        mantenedoraId: user.mantenedoraId,
      },
      include: {
        unit: true,
      },
    });

    return child;
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
      if (!canAccessUnit(user, filters.unitId)) {
        throw new ForbiddenException('Você não tem acesso a esta unidade');
      }
      where.unitId = filters.unitId;
    } else {
      // Se não especificou unidade, filtrar pelas unidades que o usuário tem acesso
      if (user.unitIds && user.unitIds.length > 0) {
        where.unitId = { in: user.unitIds };
      }
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

    return children;
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

    if (!canAccessUnit(user, child.unitId)) {
      throw new ForbiddenException('Você não tem acesso a esta unidade');
    }

    return child;
  }

  /**
   * Atualizar criança
   */
  async update(id: string, updateChildDto: UpdateChildDto, user: any) {
    const child = await this.findOne(id, user);

    const updated = await this.prisma.child.update({
      where: { id },
      data: updateChildDto,
      include: {
        unit: true,
        enrollments: {
          include: {
            classroom: true,
          },
        },
      },
    });

    return updated;
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
    const child = await this.findOne(id, user);

    // TODO: Implementar upload para S3
    // Por enquanto, apenas retornar sucesso
    const photoUrl = `/uploads/children/${id}/${file.filename}`;

    return { photoUrl, message: 'Upload de foto será implementado com S3' };
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
   */
  async addDietaryRestriction(id: string, restrictionData: any, user: any) {
    const child = await this.findOne(id, user);

    const restriction = await this.prisma.dietaryRestriction.create({
      data: {
        childId: id,
        type: restrictionData.type,
        name: restrictionData.name,
        description: restrictionData.description,
        severity: restrictionData.severity || 'leve',
      },
    });

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
