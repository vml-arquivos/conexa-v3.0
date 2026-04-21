/**
 * Catálogo científico de microgestos para Educação Infantil 0-5 anos
 * Baseado na BNCC, Campos de Experiência e literatura de desenvolvimento infantil
 */

export const MICROGESTO_CATALOGO = [
  // DESENVOLVIMENTO MOTOR
  {
    categoria: 'DESENVOLVIMENTO_MOTOR',
    id: 'COORDENACAO_FINA',
    label: 'Coordenação Fina',
    emoji: '✍️',
    desc: 'Manipulação de objetos pequenos, pinça, encaixe',
    niveis: {
      ALCANCADO: 'Realiza com independência',
      EM_DESENVOLVIMENTO: 'Realiza com apoio',
      REQUER_ATENCAO: 'Apresenta dificuldade',
    },
  },
  {
    categoria: 'DESENVOLVIMENTO_MOTOR',
    id: 'COORDENACAO_GROSSA',
    label: 'Coordenação Grossa',
    emoji: '🏃',
    desc: 'Equilíbrio, marcha, salto, arremesso',
    niveis: {
      ALCANCADO: 'Move-se com desenvoltura',
      EM_DESENVOLVIMENTO: 'Desenvolve habilidades',
      REQUER_ATENCAO: 'Necessita acompanhamento',
    },
  },
  // LINGUAGEM E COMUNICAÇÃO
  {
    categoria: 'LINGUAGEM_COMUNICACAO',
    id: 'EXPRESSAO_ORAL',
    label: 'Expressão Oral',
    emoji: '🗣️',
    desc: 'Vocabulário, articulação, narrativa',
    niveis: {
      ALCANCADO: 'Comunica-se claramente',
      EM_DESENVOLVIMENTO: 'Ampliando vocabulário',
      REQUER_ATENCAO: 'Dificuldade de expressão',
    },
  },
  {
    categoria: 'LINGUAGEM_COMUNICACAO',
    id: 'ESCUTA_ATIVA',
    label: 'Escuta Ativa',
    emoji: '👂',
    desc: 'Atenção, compreensão de instruções',
    niveis: {
      ALCANCADO: 'Demonstra atenção sustentada',
      EM_DESENVOLVIMENTO: 'Atenção intermitente',
      REQUER_ATENCAO: 'Dificuldade de escuta',
    },
  },
  {
    categoria: 'LINGUAGEM_COMUNICACAO',
    id: 'LETRAMENTO_EMERGENTE',
    label: 'Letramento Emergente',
    emoji: '📖',
    desc: 'Interesse por livros, reconhecimento de símbolos',
    niveis: {
      ALCANCADO: 'Demonstra interesse ativo',
      EM_DESENVOLVIMENTO: 'Explorando',
      REQUER_ATENCAO: 'Baixo interesse',
    },
  },
  // INTERAÇÃO SOCIAL
  {
    categoria: 'INTERACAO_SOCIAL',
    id: 'BRINCADEIRA_COOPERATIVA',
    label: 'Brincadeira Cooperativa',
    emoji: '🤝',
    desc: 'Jogo em grupo, partilha, negociação',
    niveis: {
      ALCANCADO: 'Interage e coopera bem',
      EM_DESENVOLVIMENTO: 'Coopera com mediação',
      REQUER_ATENCAO: 'Preferência por isolamento',
    },
  },
  {
    categoria: 'INTERACAO_SOCIAL',
    id: 'EMPATIA_CUIDADO',
    label: 'Empatia e Cuidado',
    emoji: '💚',
    desc: 'Percepção do outro, gesto de ajuda',
    niveis: {
      ALCANCADO: 'Demonstra empatia',
      EM_DESENVOLVIMENTO: 'Percebe o outro',
      REQUER_ATENCAO: 'Dificuldade empática',
    },
  },
  {
    categoria: 'INTERACAO_SOCIAL',
    id: 'RESOLUCAO_CONFLITO',
    label: 'Resolução de Conflito',
    emoji: '🕊️',
    desc: 'Mediação, negociação, respeito ao limite',
    niveis: {
      ALCANCADO: 'Resolve com autonomia',
      EM_DESENVOLVIMENTO: 'Resolve com apoio',
      REQUER_ATENCAO: 'Reage de forma agressiva',
    },
  },
  // REGULAÇÃO EMOCIONAL
  {
    categoria: 'REGULACAO_EMOCIONAL',
    id: 'AUTOCONTROLE',
    label: 'Autocontrole',
    emoji: '😌',
    desc: 'Controle de impulsos, tolerância à frustração',
    niveis: {
      ALCANCADO: 'Regula bem as emoções',
      EM_DESENVOLVIMENTO: 'Regula com apoio',
      REQUER_ATENCAO: 'Dificuldade de autocontrole',
    },
  },
  {
    categoria: 'REGULACAO_EMOCIONAL',
    id: 'ADAPTACAO_ROTINA',
    label: 'Adaptação à Rotina',
    emoji: '📅',
    desc: 'Transições, separação, acolhida',
    niveis: {
      ALCANCADO: 'Adapta-se tranquilamente',
      EM_DESENVOLVIMENTO: 'Adapta-se com tempo',
      REQUER_ATENCAO: 'Dificuldade de adaptação',
    },
  },
  // COGNIÇÃO E EXPLORAÇÃO
  {
    categoria: 'COGNICAO_EXPLORACAO',
    id: 'CURIOSIDADE_INVESTIGACAO',
    label: 'Curiosidade e Investigação',
    emoji: '🔍',
    desc: 'Questionamento, exploração de materiais',
    niveis: {
      ALCANCADO: 'Explora com iniciativa',
      EM_DESENVOLVIMENTO: 'Explora com estímulo',
      REQUER_ATENCAO: 'Baixa curiosidade',
    },
  },
  {
    categoria: 'COGNICAO_EXPLORACAO',
    id: 'PENSAMENTO_LOGICO',
    label: 'Pensamento Lógico',
    emoji: '🧩',
    desc: 'Sequência, classificação, quantidade',
    niveis: {
      ALCANCADO: 'Raciocina com desenvoltura',
      EM_DESENVOLVIMENTO: 'Desenvolve noções',
      REQUER_ATENCAO: 'Dificuldade conceitual',
    },
  },
  // AUTONOMIA
  {
    categoria: 'AUTONOMIA',
    id: 'AUTOCUIDADO',
    label: 'Autocuidado',
    emoji: '🙌',
    desc: 'Higiene, alimentação autônoma, vestuário',
    niveis: {
      ALCANCADO: 'Cuida-se com independência',
      EM_DESENVOLVIMENTO: 'Cuida-se com apoio',
      REQUER_ATENCAO: 'Necessita suporte constante',
    },
  },
  {
    categoria: 'AUTONOMIA',
    id: 'INICIATIVA_PROPRIA',
    label: 'Iniciativa Própria',
    emoji: '⭐',
    desc: 'Escolhas, tomada de decisão, protagonismo',
    niveis: {
      ALCANCADO: 'Toma iniciativa',
      EM_DESENVOLVIMENTO: 'Inicia com incentivo',
      REQUER_ATENCAO: 'Aguarda instrução',
    },
  },
  // ALIMENTAÇÃO
  {
    categoria: 'ALIMENTACAO',
    id: 'ACEITACAO_ALIMENTAR',
    label: 'Aceitação Alimentar',
    emoji: '🍽️',
    desc: 'Variedade, recusa, apetite',
    niveis: {
      ALCANCADO: 'Aceita bem os alimentos',
      EM_DESENVOLVIMENTO: 'Aceita parcialmente',
      REQUER_ATENCAO: 'Recusa frequente',
    },
  },
] as const;

export type MicrogestoCatalogoId = typeof MICROGESTO_CATALOGO[number]['id'];

export const MICROGESTO_POR_CATEGORIA = MICROGESTO_CATALOGO.reduce(
  (acc, m) => {
    if (!acc[m.categoria]) acc[m.categoria] = [];
    acc[m.categoria].push(m);
    return acc;
  },
  {} as Record<string, typeof MICROGESTO_CATALOGO[number][]>,
);

export const CATEGORIA_LABELS: Record<string, { label: string; emoji: string }> = {
  DESENVOLVIMENTO_MOTOR:   { label: 'Desenvolvimento Motor',    emoji: '🏃' },
  LINGUAGEM_COMUNICACAO:   { label: 'Linguagem e Comunicação',  emoji: '🗣️' },
  INTERACAO_SOCIAL:        { label: 'Interação Social',          emoji: '🤝' },
  REGULACAO_EMOCIONAL:     { label: 'Regulação Emocional',       emoji: '😌' },
  COGNICAO_EXPLORACAO:     { label: 'Cognição e Exploração',     emoji: '🔍' },
  CUIDADO_SAUDE:           { label: 'Cuidado e Saúde',           emoji: '🩺' },
  ALIMENTACAO:             { label: 'Alimentação',               emoji: '🍽️' },
  AUTONOMIA:               { label: 'Autonomia',                 emoji: '⭐' },
};
