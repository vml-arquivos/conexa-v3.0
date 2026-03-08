import { RoleLevel, RoleType } from '@prisma/client';
import { maskMatrizEntriesForProfessor, maskMatrizEntryForProfessor } from './masking.helper';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

function makeProfessor(): JwtPayload {
  return {
    sub: 'professor-1',
    email: 'prof@test.com',
    mantenedoraId: 'mant-1',
    roles: [{ roleId: 'r1', level: RoleLevel.PROFESSOR, type: RoleType.PROFESSOR, unitScopes: [] }],
  };
}

function makeCoordenador(): JwtPayload {
  return {
    sub: 'coord-1',
    email: 'coord@test.com',
    mantenedoraId: 'mant-1',
    unitId: 'unit-1',
    roles: [{ roleId: 'r2', level: RoleLevel.UNIDADE, type: RoleType.UNIDADE_COORDENADOR_PEDAGOGICO, unitScopes: [] }],
  };
}

describe('maskMatrizEntriesForProfessor', () => {
  const entries = [
    {
      id: 'e1',
      objetivoBNCC: 'Objetivo 1',
      intencionalidade: 'Intencionalidade 1',
      exemploAtividade: 'Exemplo secreto 1',
    },
    {
      id: 'e2',
      objetivoBNCC: 'Objetivo 2',
      intencionalidade: 'Intencionalidade 2',
      exemploAtividade: 'Exemplo secreto 2',
    },
  ];

  it('deve remover exemploAtividade de todas as entradas para PROFESSOR', () => {
    const result = maskMatrizEntriesForProfessor(makeProfessor(), entries);
    result.forEach((entry) => {
      expect(entry).not.toHaveProperty('exemploAtividade');
    });
  });

  it('deve manter exemploAtividade para COORDENADOR', () => {
    const result = maskMatrizEntriesForProfessor(makeCoordenador(), entries);
    result.forEach((entry) => {
      expect(entry).toHaveProperty('exemploAtividade');
    });
  });

  it('deve manter os outros campos intactos para PROFESSOR', () => {
    const result = maskMatrizEntriesForProfessor(makeProfessor(), entries);
    expect(result[0]).toHaveProperty('objetivoBNCC', 'Objetivo 1');
    expect(result[0]).toHaveProperty('intencionalidade', 'Intencionalidade 1');
  });
});

describe('maskMatrizEntryForProfessor', () => {
  it('deve remover exemploAtividade direto do objeto para PROFESSOR', () => {
    const entry = { id: 'e1', exemploAtividade: 'Secreto' };
    const result = maskMatrizEntryForProfessor(makeProfessor(), entry);
    expect(result).not.toHaveProperty('exemploAtividade');
  });

  it('deve remover exemploAtividade do pedagogicalContent para PROFESSOR', () => {
    const entry = {
      id: 'e1',
      pedagogicalContent: {
        objetivoBNCC: 'Objetivo',
        exemploAtividade: 'Secreto',
      },
    };
    const result = maskMatrizEntryForProfessor(makeProfessor(), entry);
    expect(result.pedagogicalContent).not.toHaveProperty('exemploAtividade');
    expect(result.pedagogicalContent).toHaveProperty('objetivoBNCC');
  });

  it('deve manter exemploAtividade no pedagogicalContent para COORDENADOR', () => {
    const entry = {
      id: 'e1',
      pedagogicalContent: {
        objetivoBNCC: 'Objetivo',
        exemploAtividade: 'Secreto',
      },
    };
    const result = maskMatrizEntryForProfessor(makeCoordenador(), entry);
    expect(result.pedagogicalContent).toHaveProperty('exemploAtividade', 'Secreto');
  });
});
