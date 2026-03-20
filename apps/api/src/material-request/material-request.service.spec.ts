import { Test, TestingModule } from '@nestjs/testing';
import { MaterialRequestService } from './material-request.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { RoleLevel } from '@prisma/client';

describe('MaterialRequestService - Relatório de Consumo', () => {
  let service: MaterialRequestService;
  
  const mockPrismaService = {
    materialRequest: {
      findMany: jest.fn().mockResolvedValue([
        { id: '1', status: 'APROVADO', type: 'PEDAGOGICO', estimatedCost: 100, requestedDate: new Date() },
        { id: '2', status: 'SOLICITADO', type: 'HIGIENE', estimatedCost: 50, requestedDate: new Date() },
        { id: '3', status: 'REJEITADO', type: 'LIMPEZA', estimatedCost: 30, requestedDate: new Date() },
        { id: '4', status: 'ENTREGUE', type: 'PEDAGOGICO', estimatedCost: 120, requestedDate: new Date() },
      ])
    },
    $queryRaw: jest.fn().mockResolvedValue([])
  };
  
  const mockAuditService = { logCreate: jest.fn(), logUpdate: jest.fn() };
  const mockUser = { sub: 'user-1', mantenedoraId: 'mant-1', unitId: 'unit-1', roles: [{ level: RoleLevel.UNIDADE }] } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialRequestService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    service = module.get<MaterialRequestService>(MaterialRequestService);
    jest.clearAllMocks();
  });

  it('deve retornar relatório com formato flat para os totais (total, aprovados, pendentes, etc)', async () => {
    const report = await service.relatorioConsumo(mockUser, {});
    
    expect(report).toHaveProperty('total', 4);
    expect(report).toHaveProperty('aprovados', 2); // APROVADO + ENTREGUE
    expect(report).toHaveProperty('pendentes', 1); // SOLICITADO
    expect(report).toHaveProperty('rejeitados', 1); // REJEITADO
    expect(report).toHaveProperty('entregues', 1); // ENTREGUE
    expect(report).toHaveProperty('custoEstimadoTotal', 300);
    expect(report).not.toHaveProperty('totais'); // Não deve ter o objeto aninhado
  });
});
