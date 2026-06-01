/**
 * observacoes-extractor.helper.ts
 *
 * Extrai observações individuais contextuais a partir do conteúdo pedagógico
 * do plano de aula. Funciona para QUALQUER matriz/currículo/entidade.
 *
 * Estratégia:
 * 1. Primeiro tenta usar GeminiService (se disponível) para gerar observações
 *    mais ricas e específicas ao texto real do plano
 * 2. Fallback: extrator local por palavras-chave do objetivoBNCC + intencionalidade
 *
 * O resultado é um array de ObservacaoTemplate que fica salvo no Planning
 * e é exibido no diário do dia como "observações do plano".
 */

export interface ObservacaoTemplate {
  id: string;             // identificador único, ex: "OBS_plano123_001"
  label: string;          // texto da observação, ex: "Reconheceu formas geométricas"
  emoji: string;          // emoji visual
  grupo: 'plano';         // sempre 'plano' para diferenciar das fixas
  origemObjetivo: string; // trecho do objetivo que gerou esta observação
  campoExperiencia?: string; // campo BNCC se disponível
}

/**
 * Extrai observações a partir do conteúdo pedagógico do plano.
 * Usada como fallback quando Gemini não está disponível.
 */
export function extrairObservacoesLocal(
  pedagogicalContent: Record<string, any>,
  planningId: string,
): ObservacaoTemplate[] {
  const resultado: ObservacaoTemplate[] = [];
  let seq = 0;
  const makeId = () => `OBS_${planningId.slice(-8)}_${String(++seq).padStart(3, '0')}`;

  // Coletar todos os textos relevantes do plano
  const textos = coletarTextosPedagogicos(pedagogicalContent);

  // Para cada trecho de texto, aplicar extratores temáticos
  textos.forEach(({ texto, campo, origem }) => {
    const obsDoTexto = aplicarExtratorTematico(texto, campo, origem, makeId);
    resultado.push(...obsDoTexto);
  });

  // Deduplicar por similaridade de label
  return deduplicar(resultado);
}

/**
 * Coleta os textos pedagógicos relevantes do pedagogicalContent,
 * independente do formato (BNCC, currículo municipal, próprio, etc.)
 */
function coletarTextosPedagogicos(
  content: Record<string, any>,
): Array<{ texto: string; campo: string; origem: string }> {
  const textos: Array<{ texto: string; campo: string; origem: string }> = [];

  // Campos que podem conter objetivos pedagógicos (nomes variáveis por entidade)
  const camposObjetivo = [
    'objetivoBNCC', 'objetivoCurriculo', 'objetivo', 'objectives',
    'intencionalidade', 'intencionalidadePedagogica', 'intention',
    'description', 'activities', 'atividade', 'exemploAtividade',
  ];

  // Campos que identificam o contexto/área do conhecimento
  const camposArea = [
    'campoDeExperiencia', 'campoExperiencia', 'area', 'domain',
    'campo', 'disciplina', 'eixo', 'componente',
  ];

  // Extrair campo de experiência/área principal
  let campoExperiencia = '';
  for (const c of camposArea) {
    if (content[c] && typeof content[c] === 'string') {
      campoExperiencia = content[c];
      break;
    }
  }

  // Extrair textos de objetivos
  for (const c of camposObjetivo) {
    const val = content[c];
    if (val && typeof val === 'string' && val.trim().length > 10) {
      textos.push({ texto: val.trim(), campo: campoExperiencia, origem: c });
    }
  }

  // Processar subestruturas (days[], objectives[], etc.)
  if (Array.isArray(content.days)) {
    content.days.forEach((day: any) => {
      if (day && typeof day === 'object') {
        textos.push(...coletarTextosPedagogicos(day));
      }
    });
  }

  if (Array.isArray(content.objectives)) {
    content.objectives.forEach((obj: any) => {
      if (typeof obj === 'string') {
        textos.push({ texto: obj, campo: campoExperiencia, origem: 'objectives' });
      } else if (obj && typeof obj === 'object') {
        textos.push(...coletarTextosPedagogicos(obj));
      }
    });
  }

  // Processar objeto teacher (padrão do Conexa)
  if (content.teacher && typeof content.teacher === 'object') {
    textos.push(...coletarTextosPedagogicos(content.teacher));
  }

  return textos.filter(t => t.texto.length > 10);
}

/**
 * Aplica extratores temáticos ao texto do objetivo para gerar observações.
 *
 * IMPORTANTE: Este extrator é agnóstico de matriz/currículo.
 * Detecta VERBOS DE APRENDIZAGEM e DOMÍNIOS PEDAGÓGICOS no texto,
 * sem depender de uma lista fixa de campos BNCC.
 */
function aplicarExtratorTematico(
  texto: string,
  campoExperiencia: string,
  origem: string,
  makeId: () => string,
): ObservacaoTemplate[] {
  const resultado: ObservacaoTemplate[] = [];
  const textoNorm = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // ── Mapa de padrões → observações geradas ──────────────────────────────────
  // Cada entrada: { padroes: string[], positivo: {...}, avanco: {...}, dificuldade: {...} }
  // Os padrões são buscados no texto do objetivo por substring.
  const EXTRATORES = [
    // LINGUAGEM / COMUNICAÇÃO
    {
      padroes: ['narrar', 'contar historia', 'historia', 'texto', 'narrativa', 'conto', 'fabula',
                'leitura', 'ler', 'escrita', 'escrever', 'letras', 'palavras', 'alfabeto',
                'fala', 'comunicar', 'expressar', 'vocabulario', 'linguagem'],
      positivo: { label: 'Comunicou-se com clareza na atividade', emoji: '💬' },
      avanco: { label: 'Ampliou vocabulário / expressão verbal', emoji: '📚' },
      dificuldade: { label: 'Precisou de apoio na expressão verbal', emoji: '🔤' },
    },
    // NÚMEROS / MATEMÁTICA / LÓGICA
    {
      padroes: ['numero', 'contar', 'quantidade', 'forma geometrica', 'geometr', 'matematica',
                'calcular', 'somar', 'medida', 'comparar', 'ordenar', 'classificar', 'padrao',
                'logica', 'raciocinio', 'sequencia numerica', 'mais', 'menos'],
      positivo: { label: 'Demonstrou raciocínio lógico-matemático', emoji: '🔢' },
      avanco: { label: 'Identificou padrões / relações numéricas', emoji: '🧮' },
      dificuldade: { label: 'Precisou de retomada no raciocínio lógico', emoji: '🔄' },
    },
    // ARTE / EXPRESSÃO CRIATIVA
    {
      padroes: ['desenhar', 'pintar', 'colorir', 'arte', 'artistica', 'plastica', 'criar',
                'construir', 'modelar', 'recortar', 'colar', 'colagem', 'tracos', 'cores',
                'musica', 'cantar', 'ritmo', 'danca', 'teatro', 'dramatizar', 'expressao'],
      positivo: { label: 'Explorou materiais/expressão artística', emoji: '🎨' },
      avanco: { label: 'Demonstrou criatividade e expressão própria', emoji: '✨' },
      dificuldade: { label: 'Precisou de mediação na expressão criativa', emoji: '🖌️' },
    },
    // MOTOR / CORPO / MOVIMENTO
    {
      padroes: ['corpo', 'movimento', 'motor', 'coordenacao', 'equilibrio', 'correr', 'pular',
                'saltar', 'lancar', 'manipular', 'pinca', 'tesoura', 'recorte', 'massa',
                'brincar', 'brincadeira', 'jogo', 'esporte', 'atividade fisica', 'danca'],
      positivo: { label: 'Demonstrou boa coordenação na atividade', emoji: '🏃' },
      avanco: { label: 'Avançou em habilidade motora específica', emoji: '💪' },
      dificuldade: { label: 'Demonstrou dificuldade motora a acompanhar', emoji: '⚠️' },
    },
    // SOCIAL / EMOCIONAL / ÉTICO
    {
      padroes: ['social', 'emocao', 'sentimento', 'empatia', 'respeito', 'cooperar', 'compartilhar',
                'conviver', 'coletivo', 'grupo', 'amizade', 'conflito', 'resolver', 'etica',
                'regra', 'combinado', 'responsabilidade', 'identidade', 'cultura', 'diversidade'],
      positivo: { label: 'Interagiu positivamente / demonstrou empatia', emoji: '🤝' },
      avanco: { label: 'Demonstrou maturidade socioemocional', emoji: '❤️' },
      dificuldade: { label: 'Precisou de mediação em relação social', emoji: '🕊️' },
    },
    // CIÊNCIAS / NATUREZA / EXPLORAÇÃO
    {
      padroes: ['natureza', 'ciencia', 'experimento', 'observar', 'investigar', 'curiosidade',
                'animal', 'planta', 'agua', 'terra', 'ambiente', 'sustentabilidade', 'clima',
                'transformacao', 'fenomeno', 'descobrir', 'explorar', 'hipotese'],
      positivo: { label: 'Demonstrou curiosidade investigativa', emoji: '🔬' },
      avanco: { label: 'Formulou hipótese / questionamento', emoji: '💡' },
      dificuldade: { label: 'Precisou de apoio para engajar na investigação', emoji: '🌱' },
    },
    // AUTONOMIA / CONCENTRAÇÃO / ATENÇÃO
    {
      padroes: ['autonomia', 'independencia', 'concentracao', 'atencao', 'foco', 'persistencia',
                'resolver problema', 'tomar decisao', 'escolher', 'planejar', 'organizar',
                'responsabilidade', 'cuidado', 'higiene', 'autocuidado'],
      positivo: { label: 'Demonstrou autonomia e concentração', emoji: '🙌' },
      avanco: { label: 'Tomou iniciativa de forma independente', emoji: '🚀' },
      dificuldade: { label: 'Precisou de apoio para manter o foco', emoji: '🎯' },
    },
  ];

  // Detectar quais extratores se aplicam ao texto
  const extratoresAtivos = EXTRATORES.filter(e =>
    e.padroes.some(p => textoNorm.includes(p))
  );

  // Para cada extrator ativo, gerar observações positiva, de avanço e de dificuldade
  extratoresAtivos.forEach(e => {
    resultado.push({
      id: makeId(),
      label: e.positivo.label,
      emoji: e.positivo.emoji,
      grupo: 'plano',
      origemObjetivo: texto.slice(0, 120),
      campoExperiencia,
    });
    resultado.push({
      id: makeId(),
      label: e.avanco.label,
      emoji: e.avanco.emoji,
      grupo: 'plano',
      origemObjetivo: texto.slice(0, 120),
      campoExperiencia,
    });
    resultado.push({
      id: makeId(),
      label: e.dificuldade.label,
      emoji: e.dificuldade.emoji,
      grupo: 'plano',
      origemObjetivo: texto.slice(0, 120),
      campoExperiencia,
    });
  });

  // Suprimir aviso de parâmetro não usado (origem é passado para contexto futuro)
  void origem;

  return resultado;
}

/**
 * Remove observações duplicadas ou muito similares (mesmo emoji + grupo de palavras)
 */
function deduplicar(obs: ObservacaoTemplate[]): ObservacaoTemplate[] {
  const vistas = new Set<string>();
  return obs.filter(o => {
    const chave = o.emoji + '|' + o.label.slice(0, 30);
    if (vistas.has(chave)) return false;
    vistas.add(chave);
    return true;
  });
}
