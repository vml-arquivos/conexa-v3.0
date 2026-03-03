/**
 * seed-matriz-2026-completo.js
 *
 * Cria as matrizes EI01, EI02, EI03 para 2026 com entries reais
 * da Sequência Pedagógica Piloto 2026 — COCRIS.
 *
 * Compatível com o schema atual:
 *   CurriculumMatrix: id, mantenedoraId, name, year, segment, version, description, isActive
 *   CurriculumMatrixEntry: id, matrixId, date, weekOfYear, dayOfWeek, bimester,
 *                          campoDeExperiencia, objetivoBNCC, objetivoBNCCCode,
 *                          objetivoCurriculo, intencionalidade
 *
 * Uso dentro do container:
 *   node /app/scripts/seed-matriz-2026-completo.js
 *   MANTENEDORA_ID=<id> node /app/scripts/seed-matriz-2026-completo.js
 *
 * Idempotente: usa upsert por (matrixId, date).
 */
'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Dados das entradas por segmento ─────────────────────────────────────────
// Semana 1: 09/02 a 13/02/2026 — Acolhimento e Inserção (1º Bimestre)
// Semana 2: 16/02 a 20/02/2026 — Identidade e Pertencimento
// Semana 3: 23/02 a 27/02/2026 — Vínculos e Autonomia
// Semana 4: 02/03 a 06/03/2026 — Exploração e Descoberta
// Semana 5: 09/03 a 13/03/2026 — Linguagem e Expressão
// Semana 6: 16/03 a 20/03/2026 — Natureza e Sociedade
// Semana 7: 23/03 a 27/03/2026 — Movimento e Corpo
// Semana 8: 30/03 a 03/04/2026 — Arte e Criatividade (2º Bimestre)

const ENTRIES_EI01 = [
  // ── Semana 1 (09/02–13/02) ─────────────────────────────────────────────────
  { date:'2026-02-09', weekOfYear:6,  dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS',                                        objetivoBNCCCode:'EI01EO03', objetivoBNCC:'Estabelecer vínculos afetivos com adultos e outras crianças, sentindo-se protegido e seguro no ambiente educativo.', objetivoCurriculo:'Perceber o ambiente de educação coletiva como um local afetivo e protetor, que lhe transmite segurança e acolhimento.', intencionalidade:'Favorecer a adaptação inicial dos bebês, promovendo vínculo, segurança emocional e sentimento de pertencimento ao espaço escolar.' },
  { date:'2026-02-10', weekOfYear:6,  dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS',                                   objetivoBNCCCode:'EI01CG01', objetivoBNCC:'Movimentar as partes do corpo para exprimir corporalmente emoções, necessidades e desejos.', objetivoCurriculo:'Movimentar as partes do corpo para exprimir corporalmente emoções, necessidades e desejos.', intencionalidade:'Estimular a expressão corporal como forma primordial de comunicação dos bebês.' },
  { date:'2026-02-11', weekOfYear:6,  dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS',                                  objetivoBNCCCode:'EI01TS02', objetivoBNCC:'Manipular materiais diversos e variados para explorar cores, formas, texturas e sons.', objetivoCurriculo:'Manusear objetos e brinquedos coloridos.', intencionalidade:'Ampliar a percepção visual e o interesse pelas cores por meio da exploração ativa de objetos.' },
  { date:'2026-02-12', weekOfYear:6,  dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',                         objetivoBNCCCode:'EI01EF04', objetivoBNCC:'Reconhecer quando é chamado por seu nome e reconhecer os nomes das pessoas com quem convive.', objetivoCurriculo:'Reconhecer quando é chamado por seu nome e reconhecer os nomes das pessoas com quem convive.', intencionalidade:'Fortalecer a identidade do bebê e o vínculo com os adultos e pares por meio do reconhecimento do nome.' },
  { date:'2026-02-13', weekOfYear:6,  dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',         objetivoBNCCCode:'EI01ET01', objetivoBNCC:'Explorar o ambiente pela ação e observação, manipulando, experimentando e fazendo descobertas.', objetivoCurriculo:'Explorar o ambiente pela ação e observação, manipulando, experimentando e fazendo descobertas.', intencionalidade:'Incentivar a curiosidade e a exploração ativa dos espaços e objetos do cotidiano escolar.' },
  // ── Semana 2 (16/02–20/02) ─────────────────────────────────────────────────
  { date:'2026-02-16', weekOfYear:7,  dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS',                                        objetivoBNCCCode:'EI01EO01', objetivoBNCC:'Perceber que suas ações têm efeitos nas outras crianças e nos adultos.', objetivoCurriculo:'Perceber que suas ações têm efeitos nas outras crianças e nos adultos.', intencionalidade:'Desenvolver a noção de causa e efeito nas interações sociais, ampliando a consciência de si e do outro.' },
  { date:'2026-02-17', weekOfYear:7,  dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS',                                   objetivoBNCCCode:'EI01CG03', objetivoBNCC:'Imitar gestos e movimentos de outras crianças e adultos no cuidado de si e nos jogos e brincadeiras.', objetivoCurriculo:'Imitar gestos e movimentos de outras crianças e adultos.', intencionalidade:'Estimular a imitação como estratégia de aprendizagem e de construção de vínculos.' },
  { date:'2026-02-18', weekOfYear:7,  dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS',                                  objetivoBNCCCode:'EI01TS01', objetivoBNCC:'Explorar sons produzidos com o próprio corpo e com objetos do ambiente.', objetivoCurriculo:'Explorar sons produzidos com o próprio corpo e com objetos do ambiente.', intencionalidade:'Desenvolver a percepção auditiva e a expressão sonora como forma de comunicação e prazer.' },
  { date:'2026-02-19', weekOfYear:7,  dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',                         objetivoBNCCCode:'EI01EF01', objetivoBNCC:'Reconhecer e expressar suas necessidades e sentimentos por meio de gestos, sons e palavras.', objetivoCurriculo:'Reconhecer e expressar suas necessidades e sentimentos por meio de gestos, sons e palavras.', intencionalidade:'Ampliar as formas de comunicação do bebê, valorizando gestos, sons e primeiras palavras.' },
  { date:'2026-02-20', weekOfYear:7,  dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',         objetivoBNCCCode:'EI01ET03', objetivoBNCC:'Manipular materiais variados e perceber que os objetos têm propriedades e atributos.', objetivoCurriculo:'Manipular materiais variados e perceber que os objetos têm propriedades e atributos.', intencionalidade:'Desenvolver a percepção sensorial e a capacidade de discriminar objetos por suas características.' },
  // ── Semana 3 (23/02–27/02) ─────────────────────────────────────────────────
  { date:'2026-02-23', weekOfYear:8,  dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS',                                        objetivoBNCCCode:'EI01EO04', objetivoBNCC:'Comunicar-se com outras pessoas usando movimentos, gestos, balbucios, fala e outras formas de expressão.', objetivoCurriculo:'Comunicar-se com outras pessoas usando movimentos, gestos, balbucios, fala e outras formas de expressão.', intencionalidade:'Ampliar as formas de comunicação e interação social do bebê no ambiente coletivo.' },
  { date:'2026-02-24', weekOfYear:8,  dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS',                                   objetivoBNCCCode:'EI01CG02', objetivoBNCC:'Experimentar as possibilidades corporais nas brincadeiras e interações em ambientes acolhedores e desafiantes.', objetivoCurriculo:'Experimentar as possibilidades corporais nas brincadeiras e interações.', intencionalidade:'Promover o desenvolvimento motor e a autonomia corporal por meio de brincadeiras desafiadoras.' },
  { date:'2026-02-25', weekOfYear:8,  dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS',                                  objetivoBNCCCode:'EI01TS03', objetivoBNCC:'Explorar diferentes fontes sonoras e materiais para acompanhar brincadeiras cantadas, canções, músicas e melodias.', objetivoCurriculo:'Explorar diferentes fontes sonoras para acompanhar brincadeiras cantadas.', intencionalidade:'Desenvolver o senso rítmico e a apreciação musical desde a primeira infância.' },
  { date:'2026-02-26', weekOfYear:8,  dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',                         objetivoBNCCCode:'EI01EF02', objetivoBNCC:'Demonstrar interesse ao ouvir a leitura de poemas e a apresentação de músicas.', objetivoCurriculo:'Demonstrar interesse ao ouvir a leitura de poemas e a apresentação de músicas.', intencionalidade:'Estimular o interesse pela linguagem literária e musical, ampliando o repertório cultural.' },
  { date:'2026-02-27', weekOfYear:8,  dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',         objetivoBNCCCode:'EI01ET02', objetivoBNCC:'Explorar relações de causa e efeito (transbordar, tingir, misturar, mover e remover) na interação com o mundo físico.', objetivoCurriculo:'Explorar relações de causa e efeito na interação com o mundo físico.', intencionalidade:'Desenvolver o pensamento científico inicial por meio da exploração sensorial e da observação.' },
  // ── Semana 4 (02/03–06/03) ─────────────────────────────────────────────────
  { date:'2026-03-02', weekOfYear:9,  dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS',                                        objetivoBNCCCode:'EI01EO02', objetivoBNCC:'Demonstrar imagem positiva de si e confiança em sua capacidade de realizar atividades e enfrentar desafios.', objetivoCurriculo:'Demonstrar imagem positiva de si e confiança em sua capacidade de realizar atividades.', intencionalidade:'Fortalecer a autoestima e a confiança do bebê por meio de experiências de sucesso nas atividades.' },
  { date:'2026-03-03', weekOfYear:9,  dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS',                                   objetivoBNCCCode:'EI01CG04', objetivoBNCC:'Participar do cuidado do seu corpo e da promoção do seu bem-estar.', objetivoCurriculo:'Participar do cuidado do seu corpo e da promoção do seu bem-estar.', intencionalidade:'Desenvolver a consciência corporal e a autonomia nos cuidados pessoais básicos.' },
  { date:'2026-03-04', weekOfYear:9,  dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS',                                  objetivoBNCCCode:'EI01TS02', objetivoBNCC:'Manipular materiais diversos e variados para explorar cores, formas, texturas e sons.', objetivoCurriculo:'Manusear objetos e brinquedos coloridos e de diferentes texturas.', intencionalidade:'Ampliar a exploração sensorial e a expressão criativa por meio de materiais variados.' },
  { date:'2026-03-05', weekOfYear:9,  dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',                         objetivoBNCCCode:'EI01EF03', objetivoBNCC:'Demonstrar interesse e atenção ao ouvir a leitura de histórias e outros textos narrados pelo adulto.', objetivoCurriculo:'Demonstrar interesse e atenção ao ouvir a leitura de histórias.', intencionalidade:'Desenvolver o gosto pela leitura e ampliar o vocabulário por meio da escuta de histórias.' },
  { date:'2026-03-06', weekOfYear:9,  dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',         objetivoBNCCCode:'EI01ET04', objetivoBNCC:'Manipular, experimentar, arrumar e explorar o espaço por meio de experiências de deslocamentos de si e dos objetos.', objetivoCurriculo:'Manipular, experimentar e explorar o espaço por meio de deslocamentos.', intencionalidade:'Desenvolver a orientação espacial e a coordenação motora por meio da exploração do ambiente.' },
  // ── Semana 5 (09/03–13/03) ─────────────────────────────────────────────────
  { date:'2026-03-09', weekOfYear:10, dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS',                                        objetivoBNCCCode:'EI01EO05', objetivoBNCC:'Reconhecer seu corpo e expressar suas sensações em momentos de alimentação, higiene, brincadeira e descanso.', objetivoCurriculo:'Reconhecer seu corpo e expressar suas sensações em momentos de alimentação, higiene e brincadeira.', intencionalidade:'Desenvolver a consciência corporal e a capacidade de expressão das sensações e necessidades.' },
  { date:'2026-03-10', weekOfYear:10, dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS',                                   objetivoBNCCCode:'EI01CG05', objetivoBNCC:'Utilizar os movimentos de preensão, encaixe e lançamento, ampliando suas possibilidades de manuseio de diferentes materiais e objetos.', objetivoCurriculo:'Utilizar os movimentos de preensão, encaixe e lançamento.', intencionalidade:'Desenvolver a coordenação motora fina por meio de atividades de encaixe, preensão e manipulação.' },
  { date:'2026-03-11', weekOfYear:10, dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS',                                  objetivoBNCCCode:'EI01TS01', objetivoBNCC:'Explorar sons produzidos com o próprio corpo e com objetos do ambiente.', objetivoCurriculo:'Explorar sons produzidos com o próprio corpo e com objetos do ambiente.', intencionalidade:'Ampliar a percepção auditiva e a expressão musical por meio da exploração de diferentes fontes sonoras.' },
  { date:'2026-03-12', weekOfYear:10, dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',                         objetivoBNCCCode:'EI01EF04', objetivoBNCC:'Reconhecer quando é chamado por seu nome e reconhecer os nomes das pessoas com quem convive.', objetivoCurriculo:'Reconhecer quando é chamado por seu nome.', intencionalidade:'Consolidar a identidade do bebê e ampliar o reconhecimento dos colegas e adultos do grupo.' },
  { date:'2026-03-13', weekOfYear:10, dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',         objetivoBNCCCode:'EI01ET05', objetivoBNCC:'Observar e manipular objetos e brinquedos, identificando seus atributos.', objetivoCurriculo:'Observar e manipular objetos e brinquedos, identificando seus atributos.', intencionalidade:'Desenvolver a capacidade de observação e discriminação de atributos dos objetos.' },
];

const ENTRIES_EI02 = [
  // ── Semana 1 (09/02–13/02) ─────────────────────────────────────────────────
  { date:'2026-02-09', weekOfYear:6,  dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS',                                        objetivoBNCCCode:'EI02EO01', objetivoBNCC:'Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos.', objetivoCurriculo:'Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos.', intencionalidade:'Promover o acolhimento e a construção de vínculos afetivos no retorno às aulas.' },
  { date:'2026-02-10', weekOfYear:6,  dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS',                                   objetivoBNCCCode:'EI02CG01', objetivoBNCC:'Apropriar-se de gestos e movimentos de sua cultura no cuidado de si e nos jogos e brincadeiras.', objetivoCurriculo:'Apropriar-se de gestos e movimentos de sua cultura no cuidado de si e nos jogos e brincadeiras.', intencionalidade:'Desenvolver autonomia nos cuidados pessoais e nas brincadeiras.' },
  { date:'2026-02-11', weekOfYear:6,  dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS',                                  objetivoBNCCCode:'EI02TS02', objetivoBNCC:'Utilizar materiais variados com possibilidades de manipulação, explorando cores, texturas, superfícies, planos, formas e volumes ao criar objetos tridimensionais.', objetivoCurriculo:'Utilizar materiais variados explorando cores, texturas e formas.', intencionalidade:'Estimular a criatividade e a expressão através de materiais tridimensionais.' },
  { date:'2026-02-12', weekOfYear:6,  dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',                         objetivoBNCCCode:'EI02EF01', objetivoBNCC:'Dialogar com crianças e adultos, expressando seus desejos, necessidades, sentimentos e opiniões.', objetivoCurriculo:'Dialogar com crianças e adultos, expressando seus desejos e sentimentos.', intencionalidade:'Ampliar a linguagem oral e a capacidade de expressão.' },
  { date:'2026-02-13', weekOfYear:6,  dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',         objetivoBNCCCode:'EI02ET01', objetivoBNCC:'Explorar e descrever semelhanças e diferenças entre as características e propriedades dos objetos (textura, massa, tamanho).', objetivoCurriculo:'Explorar e descrever semelhanças e diferenças entre objetos.', intencionalidade:'Desenvolver a observação e a capacidade de comparação.' },
  // ── Semana 2 (16/02–20/02) ─────────────────────────────────────────────────
  { date:'2026-02-16', weekOfYear:7,  dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS',                                        objetivoBNCCCode:'EI02EO03', objetivoBNCC:'Compartilhar os objetos e os espaços com crianças da mesma faixa etária e adultos.', objetivoCurriculo:'Compartilhar os objetos e os espaços com crianças da mesma faixa etária e adultos.', intencionalidade:'Desenvolver a capacidade de compartilhar e negociar o uso de objetos e espaços coletivos.' },
  { date:'2026-02-17', weekOfYear:7,  dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS',                                   objetivoBNCCCode:'EI02CG03', objetivoBNCC:'Explorar formas de deslocamento no espaço (pular, saltar, dançar), combinando movimentos e seguindo orientações.', objetivoCurriculo:'Explorar formas de deslocamento no espaço combinando movimentos.', intencionalidade:'Ampliar o repertório motor e a coordenação por meio de brincadeiras de movimento.' },
  { date:'2026-02-18', weekOfYear:7,  dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS',                                  objetivoBNCCCode:'EI02TS01', objetivoBNCC:'Criar sons com materiais, objetos e instrumentos musicais, para acompanhar diversos ritmos de música.', objetivoCurriculo:'Criar sons com materiais, objetos e instrumentos musicais.', intencionalidade:'Desenvolver a criatividade sonora e a percepção rítmica por meio da exploração musical.' },
  { date:'2026-02-19', weekOfYear:7,  dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',                         objetivoBNCCCode:'EI02EF03', objetivoBNCC:'Demonstrar interesse e atenção ao ouvir a leitura de histórias e outros textos narrados pelo adulto.', objetivoCurriculo:'Demonstrar interesse e atenção ao ouvir a leitura de histórias.', intencionalidade:'Desenvolver o gosto pela leitura e ampliar o vocabulário por meio da escuta de histórias.' },
  { date:'2026-02-20', weekOfYear:7,  dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',         objetivoBNCCCode:'EI02ET03', objetivoBNCC:'Identificar e selecionar fontes de informações, para responder a questões sobre a natureza, seus fenômenos, sua conservação.', objetivoCurriculo:'Identificar e selecionar fontes de informações sobre a natureza.', intencionalidade:'Estimular a curiosidade científica e o pensamento investigativo sobre o mundo natural.' },
  // ── Semana 3 (23/02–27/02) ─────────────────────────────────────────────────
  { date:'2026-02-23', weekOfYear:8,  dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS',                                        objetivoBNCCCode:'EI02EO04', objetivoBNCC:'Comunicar-se com outras pessoas usando movimentos, gestos, balbucios, fala e outras formas de expressão.', objetivoCurriculo:'Comunicar-se com outras pessoas usando movimentos, gestos e fala.', intencionalidade:'Ampliar as formas de comunicação e expressão oral no contexto coletivo.' },
  { date:'2026-02-24', weekOfYear:8,  dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS',                                   objetivoBNCCCode:'EI02CG04', objetivoBNCC:'Demonstrar progressiva independência no cuidado do seu corpo.', objetivoCurriculo:'Demonstrar progressiva independência no cuidado do seu corpo.', intencionalidade:'Desenvolver a autonomia e a responsabilidade nos cuidados pessoais.' },
  { date:'2026-02-25', weekOfYear:8,  dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS',                                  objetivoBNCCCode:'EI02TS03', objetivoBNCC:'Utilizar diferentes fontes sonoras disponíveis no ambiente em brincadeiras cantadas, canções, músicas e melodias.', objetivoCurriculo:'Utilizar diferentes fontes sonoras em brincadeiras cantadas.', intencionalidade:'Ampliar o repertório musical e a expressão criativa por meio de brincadeiras sonoras.' },
  { date:'2026-02-26', weekOfYear:8,  dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',                         objetivoBNCCCode:'EI02EF05', objetivoBNCC:'Relatar experiências e fatos acontecidos, histórias ouvidas, filmes ou peças teatrais assistidos etc.', objetivoCurriculo:'Relatar experiências e fatos acontecidos.', intencionalidade:'Desenvolver a memória narrativa e a capacidade de relatar experiências vividas.' },
  { date:'2026-02-27', weekOfYear:8,  dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',         objetivoBNCCCode:'EI02ET02', objetivoBNCC:'Observar, relatar e descrever incidentes do cotidiano e fenômenos naturais (luz solar, vento, chuva etc.).', objetivoCurriculo:'Observar, relatar e descrever incidentes do cotidiano e fenômenos naturais.', intencionalidade:'Desenvolver a observação científica e a capacidade de descrição de fenômenos naturais.' },
  // ── Semana 4 (02/03–06/03) ─────────────────────────────────────────────────
  { date:'2026-03-02', weekOfYear:9,  dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS',                                        objetivoBNCCCode:'EI02EO02', objetivoBNCC:'Agir de maneira cada vez mais independente com confiança em suas capacidades, reconhecendo suas conquistas e limitações.', objetivoCurriculo:'Agir de maneira cada vez mais independente com confiança em suas capacidades.', intencionalidade:'Fortalecer a autoconfiança e a autonomia da criança nas atividades cotidianas.' },
  { date:'2026-03-03', weekOfYear:9,  dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS',                                   objetivoBNCCCode:'EI02CG02', objetivoBNCC:'Deslocar seu corpo no espaço, orientando-se por noções como em frente, atrás, no alto, embaixo, dentro, fora etc.', objetivoCurriculo:'Deslocar seu corpo no espaço, orientando-se por noções espaciais.', intencionalidade:'Desenvolver a orientação espacial e a lateralidade por meio de brincadeiras de movimento.' },
  { date:'2026-03-04', weekOfYear:9,  dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS',                                  objetivoBNCCCode:'EI02TS02', objetivoBNCC:'Utilizar materiais variados com possibilidades de manipulação, explorando cores, texturas, superfícies e formas.', objetivoCurriculo:'Utilizar materiais variados explorando cores, texturas e formas.', intencionalidade:'Ampliar a expressão plástica e a criatividade por meio de materiais diversificados.' },
  { date:'2026-03-05', weekOfYear:9,  dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',                         objetivoBNCCCode:'EI02EF06', objetivoBNCC:'Criar e contar histórias oralmente, com base em imagens ou temas sugeridos.', objetivoCurriculo:'Criar e contar histórias oralmente.', intencionalidade:'Desenvolver a imaginação e a criatividade narrativa por meio da criação de histórias.' },
  { date:'2026-03-06', weekOfYear:9,  dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',         objetivoBNCCCode:'EI02ET04', objetivoBNCC:'Identificar relações espaciais (dentro e fora, em cima, embaixo, acima, abaixo, entre e do lado) e temporais (antes, durante e depois).', objetivoCurriculo:'Identificar relações espaciais e temporais.', intencionalidade:'Desenvolver a noção de espaço e tempo por meio de atividades lúdicas e situações cotidianas.' },
  // ── Semana 5 (09/03–13/03) ─────────────────────────────────────────────────
  { date:'2026-03-09', weekOfYear:10, dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS',                                        objetivoBNCCCode:'EI02EO05', objetivoBNCC:'Perceber que as pessoas têm características físicas diferentes, respeitando essas diferenças.', objetivoCurriculo:'Perceber que as pessoas têm características físicas diferentes, respeitando essas diferenças.', intencionalidade:'Desenvolver o respeito à diversidade e à identidade de cada criança.' },
  { date:'2026-03-10', weekOfYear:10, dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS',                                   objetivoBNCCCode:'EI02CG05', objetivoBNCC:'Desenvolver progressivamente as habilidades manuais, adquirindo controle para desenhar, pintar, rasgar, dobrar, esculpir.', objetivoCurriculo:'Desenvolver progressivamente as habilidades manuais.', intencionalidade:'Ampliar a coordenação motora fina por meio de atividades de artes visuais.' },
  { date:'2026-03-11', weekOfYear:10, dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS',                                  objetivoBNCCCode:'EI02TS01', objetivoBNCC:'Criar sons com materiais, objetos e instrumentos musicais, para acompanhar diversos ritmos de música.', objetivoCurriculo:'Criar sons com materiais, objetos e instrumentos musicais.', intencionalidade:'Ampliar o repertório musical e a expressão criativa por meio da exploração sonora.' },
  { date:'2026-03-12', weekOfYear:10, dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',                         objetivoBNCCCode:'EI02EF04', objetivoBNCC:'Formular e responder perguntas sobre fatos passados, presentes e futuros.', objetivoCurriculo:'Formular e responder perguntas sobre fatos passados, presentes e futuros.', intencionalidade:'Desenvolver o pensamento temporal e a capacidade de reflexão sobre experiências vividas.' },
  { date:'2026-03-13', weekOfYear:10, dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',         objetivoBNCCCode:'EI02ET05', objetivoBNCC:'Classificar objetos e figuras de acordo com suas semelhanças e diferenças.', objetivoCurriculo:'Classificar objetos e figuras de acordo com suas semelhanças e diferenças.', intencionalidade:'Desenvolver o pensamento lógico-matemático por meio da classificação e comparação.' },
];

const ENTRIES_EI03 = [
  // ── Semana 1 (09/02–13/02) ─────────────────────────────────────────────────
  { date:'2026-02-09', weekOfYear:6,  dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS',                                        objetivoBNCCCode:'EI03EO01', objetivoBNCC:'Demonstrar empatia pelos outros, percebendo que as pessoas têm diferentes sentimentos, necessidades e maneiras de pensar e agir.', objetivoCurriculo:'Demonstrar empatia pelos outros, percebendo que as pessoas têm diferentes sentimentos e maneiras de pensar.', intencionalidade:'Desenvolver a empatia e a capacidade de reconhecer e respeitar as diferenças entre as pessoas.' },
  { date:'2026-02-10', weekOfYear:6,  dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS',                                   objetivoBNCCCode:'EI03CG01', objetivoBNCC:'Criar com o corpo formas diversificadas de expressão de sentimentos, sensações e emoções, tanto nas situações do cotidiano quanto em brincadeiras, dança, teatro, música.', objetivoCurriculo:'Criar com o corpo formas diversificadas de expressão de sentimentos e emoções.', intencionalidade:'Ampliar a expressão corporal e emocional por meio de atividades de dança, teatro e movimento.' },
  { date:'2026-02-11', weekOfYear:6,  dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS',                                  objetivoBNCCCode:'EI03TS02', objetivoBNCC:'Expressar-se livremente por meio de desenho, pintura, colagem, dobradura e escultura, criando produções bidimensionais e tridimensionais.', objetivoCurriculo:'Expressar-se livremente por meio de desenho, pintura, colagem e escultura.', intencionalidade:'Desenvolver a expressão artística e a criatividade por meio de diferentes linguagens plásticas.' },
  { date:'2026-02-12', weekOfYear:6,  dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',                         objetivoBNCCCode:'EI03EF01', objetivoBNCC:'Expressar ideias, desejos e sentimentos sobre suas vivências, por meio da linguagem oral e escrita (escrita espontânea), de fotos, desenhos e outras formas de expressão.', objetivoCurriculo:'Expressar ideias, desejos e sentimentos sobre suas vivências por meio da linguagem oral e escrita.', intencionalidade:'Ampliar as formas de expressão e comunicação, valorizando a escrita espontânea e o desenho.' },
  { date:'2026-02-13', weekOfYear:6,  dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',         objetivoBNCCCode:'EI03ET01', objetivoBNCC:'Estabelecer relações de comparação entre objetos, observando suas propriedades.', objetivoCurriculo:'Estabelecer relações de comparação entre objetos, observando suas propriedades.', intencionalidade:'Desenvolver o pensamento lógico-matemático por meio da comparação e classificação de objetos.' },
  // ── Semana 2 (16/02–20/02) ─────────────────────────────────────────────────
  { date:'2026-02-16', weekOfYear:7,  dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS',                                        objetivoBNCCCode:'EI03EO03', objetivoBNCC:'Ampliar as relações interpessoais, desenvolvendo atitudes de participação e cooperação.', objetivoCurriculo:'Ampliar as relações interpessoais, desenvolvendo atitudes de participação e cooperação.', intencionalidade:'Desenvolver a cooperação e a participação ativa em atividades coletivas.' },
  { date:'2026-02-17', weekOfYear:7,  dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS',                                   objetivoBNCCCode:'EI03CG03', objetivoBNCC:'Demonstrar controle e adequação do uso de seu corpo em brincadeiras e jogos, escuta e reconto de histórias, atividades artísticas, entre outras possibilidades.', objetivoCurriculo:'Demonstrar controle e adequação do uso de seu corpo em brincadeiras e jogos.', intencionalidade:'Ampliar o controle corporal e a coordenação motora em situações diversificadas.' },
  { date:'2026-02-18', weekOfYear:7,  dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS',                                  objetivoBNCCCode:'EI03TS01', objetivoBNCC:'Utilizar sons produzidos por materiais, objetos e instrumentos musicais durante brincadeiras de faz de conta, encenações, criações musicais, festas.', objetivoCurriculo:'Utilizar sons produzidos por materiais, objetos e instrumentos musicais.', intencionalidade:'Desenvolver a expressão musical e a criatividade sonora em contextos lúdicos.' },
  { date:'2026-02-19', weekOfYear:7,  dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',                         objetivoBNCCCode:'EI03EF03', objetivoBNCC:'Escolher e folhear livros, procurando orientar-se por temas e ilustrações e tentando identificar palavras conhecidas.', objetivoCurriculo:'Escolher e folhear livros, procurando orientar-se por temas e ilustrações.', intencionalidade:'Desenvolver o interesse pela leitura e a capacidade de orientação em textos escritos.' },
  { date:'2026-02-20', weekOfYear:7,  dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',         objetivoBNCCCode:'EI03ET03', objetivoBNCC:'Identificar e selecionar fontes de informações, para responder a questões sobre a natureza, seus fenômenos, sua conservação.', objetivoCurriculo:'Identificar e selecionar fontes de informações sobre a natureza.', intencionalidade:'Estimular a curiosidade científica e o pensamento investigativo sobre o mundo natural.' },
  // ── Semana 3 (23/02–27/02) ─────────────────────────────────────────────────
  { date:'2026-02-23', weekOfYear:8,  dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS',                                        objetivoBNCCCode:'EI03EO04', objetivoBNCC:'Comunicar suas ideias e sentimentos a pessoas e grupos diversos.', objetivoCurriculo:'Comunicar suas ideias e sentimentos a pessoas e grupos diversos.', intencionalidade:'Ampliar a capacidade comunicativa e a expressão de ideias em diferentes contextos sociais.' },
  { date:'2026-02-24', weekOfYear:8,  dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS',                                   objetivoBNCCCode:'EI03CG04', objetivoBNCC:'Adotar hábitos de autocuidado relacionados a higiene, alimentação, conforto e aparência.', objetivoCurriculo:'Adotar hábitos de autocuidado relacionados a higiene, alimentação e aparência.', intencionalidade:'Desenvolver a autonomia e a responsabilidade nos cuidados pessoais e na saúde.' },
  { date:'2026-02-25', weekOfYear:8,  dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS',                                  objetivoBNCCCode:'EI03TS03', objetivoBNCC:'Reconhecer as qualidades do som (intensidade, duração, altura e timbre), utilizando-as em suas produções sonoras e ao ouvir músicas e sons.', objetivoCurriculo:'Reconhecer as qualidades do som utilizando-as em suas produções sonoras.', intencionalidade:'Desenvolver a percepção auditiva e a expressão musical com maior refinamento.' },
  { date:'2026-02-26', weekOfYear:8,  dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',                         objetivoBNCCCode:'EI03EF05', objetivoBNCC:'Recontar histórias ouvidas para produção de reconto escrito, tendo o professor como escriba.', objetivoCurriculo:'Recontar histórias ouvidas para produção de reconto escrito.', intencionalidade:'Desenvolver a memória narrativa e a capacidade de reconto com apoio da escrita.' },
  { date:'2026-02-27', weekOfYear:8,  dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',         objetivoBNCCCode:'EI03ET02', objetivoBNCC:'Observar e descrever mudanças em diferentes materiais, resultantes de ações sobre eles, em experimentos envolvendo fenômenos naturais e artificiais.', objetivoCurriculo:'Observar e descrever mudanças em diferentes materiais resultantes de ações sobre eles.', intencionalidade:'Desenvolver o pensamento científico por meio da observação e descrição de experimentos.' },
  // ── Semana 4 (02/03–06/03) ─────────────────────────────────────────────────
  { date:'2026-03-02', weekOfYear:9,  dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS',                                        objetivoBNCCCode:'EI03EO02', objetivoBNCC:'Agir de maneira independente, com confiança em suas capacidades, reconhecendo suas conquistas e limitações.', objetivoCurriculo:'Agir de maneira independente, com confiança em suas capacidades.', intencionalidade:'Fortalecer a autoconfiança e a autonomia da criança nas atividades escolares.' },
  { date:'2026-03-03', weekOfYear:9,  dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS',                                   objetivoBNCCCode:'EI03CG02', objetivoBNCC:'Demonstrar controle e adequação do uso de seu corpo em brincadeiras e jogos, escuta e reconto de histórias, atividades artísticas.', objetivoCurriculo:'Demonstrar controle e adequação do uso de seu corpo em brincadeiras e jogos.', intencionalidade:'Ampliar o controle corporal e a coordenação em atividades diversificadas.' },
  { date:'2026-03-04', weekOfYear:9,  dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS',                                  objetivoBNCCCode:'EI03TS02', objetivoBNCC:'Expressar-se livremente por meio de desenho, pintura, colagem, dobradura e escultura.', objetivoCurriculo:'Expressar-se livremente por meio de diferentes linguagens plásticas.', intencionalidade:'Ampliar a expressão artística e a criatividade por meio de diferentes técnicas plásticas.' },
  { date:'2026-03-05', weekOfYear:9,  dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',                         objetivoBNCCCode:'EI03EF06', objetivoBNCC:'Produzir suas próprias histórias orais e escritas (escrita espontânea), em situações com função social significativa.', objetivoCurriculo:'Produzir suas próprias histórias orais e escritas em situações com função social.', intencionalidade:'Desenvolver a autoria e a criatividade narrativa em contextos com função social real.' },
  { date:'2026-03-06', weekOfYear:9,  dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',         objetivoBNCCCode:'EI03ET04', objetivoBNCC:'Registrar observações, manipulações e medidas, usando múltiplas linguagens (desenho, registro por números ou escrita espontânea), em diferentes suportes.', objetivoCurriculo:'Registrar observações e medidas usando múltiplas linguagens.', intencionalidade:'Desenvolver a capacidade de registro e documentação de experiências de aprendizagem.' },
  // ── Semana 5 (09/03–13/03) ─────────────────────────────────────────────────
  { date:'2026-03-09', weekOfYear:10, dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS',                                        objetivoBNCCCode:'EI03EO05', objetivoBNCC:'Demonstrar valorização das características de seu corpo e respeitar as características dos outros.', objetivoCurriculo:'Demonstrar valorização das características de seu corpo e respeitar as características dos outros.', intencionalidade:'Desenvolver a autoestima e o respeito à diversidade corporal e cultural.' },
  { date:'2026-03-10', weekOfYear:10, dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS',                                   objetivoBNCCCode:'EI03CG05', objetivoBNCC:'Coordenar suas habilidades manuais no atendimento adequado a diversas propostas de artes visuais.', objetivoCurriculo:'Coordenar suas habilidades manuais no atendimento a propostas de artes visuais.', intencionalidade:'Ampliar a coordenação motora fina e a expressão artística em atividades de artes visuais.' },
  { date:'2026-03-11', weekOfYear:10, dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS',                                  objetivoBNCCCode:'EI03TS01', objetivoBNCC:'Utilizar sons produzidos por materiais, objetos e instrumentos musicais durante brincadeiras de faz de conta e criações musicais.', objetivoCurriculo:'Utilizar sons produzidos por materiais e instrumentos musicais.', intencionalidade:'Ampliar o repertório musical e a expressão criativa em contextos lúdicos e artísticos.' },
  { date:'2026-03-12', weekOfYear:10, dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',                         objetivoBNCCCode:'EI03EF02', objetivoBNCC:'Inventar brincadeiras cantadas, poemas e canções, criando rimas, aliterações e ritmos.', objetivoCurriculo:'Inventar brincadeiras cantadas, poemas e canções, criando rimas e ritmos.', intencionalidade:'Desenvolver a criatividade poética e a consciência fonológica por meio de jogos com a linguagem.' },
  { date:'2026-03-13', weekOfYear:10, dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',         objetivoBNCCCode:'EI03ET05', objetivoBNCC:'Classificar objetos e figuras de acordo com suas semelhanças e diferenças, justificando seus critérios de classificação.', objetivoCurriculo:'Classificar objetos e figuras justificando seus critérios de classificação.', intencionalidade:'Desenvolver o pensamento lógico-matemático e a capacidade de argumentação.' },
];

// ─── Configuração das matrizes ────────────────────────────────────────────────
const MATRIZES = [
  { segment: 'EI01', name: 'Matriz Curricular EI01 — Berçário (0 a 18 meses)', description: 'Sequência Pedagógica Piloto 2026 — Bebês (0 a 18 meses)', entries: ENTRIES_EI01 },
  { segment: 'EI02', name: 'Matriz Curricular EI02 — Maternal (19 a 47 meses)', description: 'Sequência Pedagógica Piloto 2026 — Crianças Bem Pequenas (19 a 47 meses)', entries: ENTRIES_EI02 },
  { segment: 'EI03', name: 'Matriz Curricular EI03 — Pré-Escola (48 a 71 meses)', description: 'Sequência Pedagógica Piloto 2026 — Crianças Pequenas (48 a 71 meses)', entries: ENTRIES_EI03 },
];

async function main() {
  console.log('🌱 seed-matriz-2026-completo.js — iniciando...\n');

  // ── 1. Encontrar a mantenedora ──────────────────────────────────────────────
  let mantenedoraId = process.env.MANTENEDORA_ID;

  if (!mantenedoraId) {
    let mantenedora = await prisma.mantenedora.findFirst({
      where: { name: { contains: 'Conexa', mode: 'insensitive' } },
    });
    if (!mantenedora) {
      mantenedora = await prisma.mantenedora.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }
    if (!mantenedora) {
      console.error('❌ Nenhuma mantenedora encontrada. Abortando.');
      process.exit(1);
    }
    mantenedoraId = mantenedora.id;
    console.log(`✅ Mantenedora: ${mantenedora.name} (${mantenedoraId})\n`);
  } else {
    console.log(`✅ Usando MANTENEDORA_ID: ${mantenedoraId}\n`);
  }

  let totalMatricesCriadas = 0;
  let totalEntriesCriadas = 0;

  for (const config of MATRIZES) {
    console.log(`\n📚 Processando ${config.segment}...`);

    // ── 2. Criar ou buscar a matriz ──────────────────────────────────────────
    let matrix = await prisma.curriculumMatrix.findFirst({
      where: { mantenedoraId, year: 2026, segment: config.segment, isActive: true },
    });

    if (!matrix) {
      // Verificar se existe inativa
      const inactive = await prisma.curriculumMatrix.findFirst({
        where: { mantenedoraId, year: 2026, segment: config.segment },
      });
      if (inactive) {
        matrix = await prisma.curriculumMatrix.update({
          where: { id: inactive.id },
          data: { isActive: true, name: config.name, description: config.description },
        });
        console.log(`   ↳ Matriz reativada: "${matrix.name}"`);
      } else {
        matrix = await prisma.curriculumMatrix.create({
          data: {
            mantenedoraId,
            name: config.name,
            year: 2026,
            segment: config.segment,
            version: 1,
            description: config.description,
            isActive: true,
          },
        });
        totalMatricesCriadas++;
        console.log(`   ↳ Matriz criada: "${matrix.name}" (${matrix.id})`);
      }
    } else {
      console.log(`   ↳ Matriz já existe: "${matrix.name}" (${matrix.id})`);
    }

    // ── 3. Inserir entries (idempotente via upsert) ──────────────────────────
    let inseridas = 0;
    let atualizadas = 0;

    for (const entry of config.entries) {
      const date = new Date(entry.date + 'T12:00:00.000Z');
      const result = await prisma.curriculumMatrixEntry.upsert({
        where: { matrixId_date: { matrixId: matrix.id, date } },
        update: {
          weekOfYear: entry.weekOfYear,
          dayOfWeek: entry.dayOfWeek,
          bimester: entry.bimester,
          campoDeExperiencia: entry.campoDeExperiencia,
          objetivoBNCC: entry.objetivoBNCC,
          objetivoBNCCCode: entry.objetivoBNCCCode,
          objetivoCurriculo: entry.objetivoCurriculo,
          intencionalidade: entry.intencionalidade,
        },
        create: {
          matrixId: matrix.id,
          date,
          weekOfYear: entry.weekOfYear,
          dayOfWeek: entry.dayOfWeek,
          bimester: entry.bimester,
          campoDeExperiencia: entry.campoDeExperiencia,
          objetivoBNCC: entry.objetivoBNCC,
          objetivoBNCCCode: entry.objetivoBNCCCode,
          objetivoCurriculo: entry.objetivoCurriculo,
          intencionalidade: entry.intencionalidade,
        },
      });
      // Detectar se foi criado ou atualizado (createdAt === updatedAt = criado)
      const diff = Math.abs(result.updatedAt - result.createdAt);
      if (diff < 1000) inseridas++;
      else atualizadas++;
    }

    totalEntriesCriadas += inseridas;
    console.log(`   ↳ ${inseridas} entries criadas, ${atualizadas} atualizadas (total: ${config.entries.length})`);
  }

  // ── 4. Verificação final ───────────────────────────────────────────────────
  console.log('\n📊 Verificação final:');
  const finalMatrices = await prisma.curriculumMatrix.findMany({
    where: { mantenedoraId, year: 2026, isActive: true },
    select: { segment: true, name: true, _count: { select: { entries: true } } },
    orderBy: { segment: 'asc' },
  });

  finalMatrices.forEach(m =>
    console.log(`   ${m.segment}: "${m.name}" — ${m._count.entries} entries`)
  );

  console.log(`\n✅ Concluído!`);
  console.log(`   Matrizes criadas: ${totalMatricesCriadas}`);
  console.log(`   Entries criadas: ${totalEntriesCriadas}`);

  const allPresent = ['EI01','EI02','EI03'].every(s => finalMatrices.some(m => m.segment === s));
  if (allPresent) {
    console.log('\n🎉 EI01, EI02 e EI03 estão ativas e com entries!');
    console.log('   O formulário de planejamento agora mostrará os objetivos automaticamente.');
  } else {
    const missing = ['EI01','EI02','EI03'].filter(s => !finalMatrices.some(m => m.segment === s));
    console.warn(`\n⚠️  Segmentos ainda faltando: ${missing.join(', ')}`);
  }
}

main()
  .catch(e => {
    console.error('❌ Erro:', e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
