import { Injectable } from '@nestjs/common';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

export interface FeatureFlags {
  /** Widget "Hoje" no dashboard do professor */
  widgetHoje: boolean;
  /** Planejamento por data (V2) */
  planejamentoV2: boolean;
  /** Coordenação Geral desbloqueada para STAFF_CENTRAL */
  coordenacaoGeral: boolean;
  /** Insights e analytics avançados */
  insights: boolean;
  /** Aprovação/devolução de planejamentos */
  aprovacaoPlanejamento: boolean;
  /** Exemplo de atividade visível (apenas coordenação+) */
  exemploAtividade: boolean;
  /** SuperSaaS: acesso a todas as unidades da mantenedora */
  superSaas: boolean;
}

@Injectable()
export class FeatureFlagsService {
  getFlagsForUser(user: JwtPayload): FeatureFlags {
    const level = user.roles?.[0]?.level ?? 'PROFESSOR';
    const isProfessor = level === 'PROFESSOR';
    const isUnidade = level === 'UNIDADE';
    const isStaffCentral = level === 'STAFF_CENTRAL';
    const isMantenedora = level === 'MANTENEDORA';
    const isDeveloper = level === 'DEVELOPER';

    const isCoordOrAbove = isUnidade || isStaffCentral || isMantenedora || isDeveloper;
    const isCentralOrAbove = isStaffCentral || isMantenedora || isDeveloper;

    return {
      widgetHoje: true, // disponível para todos
      planejamentoV2: true, // disponível para todos
      coordenacaoGeral: isCentralOrAbove,
      insights: isCoordOrAbove,
      // REGRA DE NEGÓCIO: apenas UNIDADE (coordenação da unidade) pode aprovar planejamentos.
      // STAFF_CENTRAL é somente leitura/análise — não aprova, não devolve.
      aprovacaoPlanejamento: isUnidade || isDeveloper,
      exemploAtividade: isCoordOrAbove,
      superSaas: isCentralOrAbove,
    };
  }
}
