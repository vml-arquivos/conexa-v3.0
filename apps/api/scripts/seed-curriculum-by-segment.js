/**
 * seed-curriculum-by-segment.js
 *
 * Popula os objetivos corretos de cada segmento (EI01, EI02, EI03)
 * a partir dos objetivos BNCC reais da Matriz Curricular 2026 COCRIS.
 *
 * Corrige o problema de clonagem: EI02 e EI03 não devem ter objetivos de EI01.
 *
 * Uso:
 *   SEGMENT=EI02 node /app/scripts/seed-curriculum-by-segment.js
 *   SEGMENT=EI03 node /app/scripts/seed-curriculum-by-segment.js
 *   SEGMENT=ALL  node /app/scripts/seed-curriculum-by-segment.js
 *   DRY_RUN=true SEGMENT=EI02 node /app/scripts/seed-curriculum-by-segment.js
 *
 * Faixas etárias (BNCC / Currículo em Movimento DF):
 *   EI01 – Bebês:                 0–18 meses   (Berçário I, Berçário II)
 *   EI02 – Crianças Bem Pequenas: 19–47 meses  (Maternal I, Maternal II)
 *   EI03 – Crianças Pequenas:     48–71 meses  (I Período, Primeiro Período)
 */
'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN === 'true';
const TARGET_SEGMENT = process.env.SEGMENT || 'ALL';
const YEAR = 2026;

// ─── Objetivos BNCC por código (extraídos da Matriz Curricular COCRIS 2026) ──
const OBJECTIVES = {
  // EI01 – BEBÊS (0–18 meses)
  EI01EO01: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Interagir com outras crianças e adultos, adaptando-se gradativamente às rotinas de cuidado.', curriculo: 'Interagir com crianças de diferentes faixas etárias e com adultos, percebendo que suas ações têm efeitos nas outras pessoas e constituindo relações de amizade.', intencionalidade: 'Promover interações afetivas entre os bebês e os adultos, favorecendo a construção inicial de vínculos e a percepção do outro.' },
  EI01EO02: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Comunicar necessidades, desejos e emoções, utilizando gestos, balbucios e palavras.', curriculo: 'Comunicar necessidades, desejos e emoções, utilizando gestos, balbucios, palavras.', intencionalidade: 'Favorecer a expressão das necessidades e emoções dos bebês nas interações cotidianas, com escuta sensível do adulto.' },
  EI01EO03: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Estabelecer vínculos afetivos com adultos e outras crianças, sentindo-se protegido e seguro no ambiente educativo.', curriculo: 'Perceber o ambiente de educação coletiva como um local afetivo e protetor, que lhe transmite segurança e acolhimento.', intencionalidade: 'Favorecer a adaptação inicial dos bebês, promovendo vínculo, segurança emocional e sentimento de pertencimento ao espaço escolar.' },
  EI01EO04: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos.', curriculo: 'Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos.', intencionalidade: 'Cultivar atitudes de empatia e cuidado nas interações cotidianas dos bebês.' },
  EI01EO05: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Reconhecer limites e normas de convívio social e começar a segui-los.', curriculo: 'Conhecer, utilizar e negociar regras básicas de convívio social nas interações.', intencionalidade: 'Introduzir gradualmente noções de limite e convivência respeitosa nos bebês.' },
  EI01EO06: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Experimentar a autonomia progressiva no cuidado do seu corpo.', curriculo: 'Experimentar progressiva autonomia no cuidado do próprio corpo.', intencionalidade: 'Estimular a independência progressiva nos cuidados corporais básicos dos bebês.' },
  EI01EO07: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Resolver conflitos nas interações cotidianas com adultos e crianças de forma simples.', curriculo: 'Resolver conflitos nas interações cotidianas de forma simples, com mediação do adulto.', intencionalidade: 'Mediar situações de conflito entre bebês, favorecendo resolução pacífica com apoio do adulto.' },
  EI01CG01: { campo: 'CORPO_GESTOS_E_MOVIMENTOS', bncc: 'Movimentar as partes do corpo para exprimir corporalmente emoções, necessidades e desejos.', curriculo: 'Movimentar as partes do corpo para exprimir corporalmente emoções, necessidades e desejos.', intencionalidade: 'Estimular a expressão corporal como forma primordial de comunicação dos bebês.' },
  EI01CG02: { campo: 'CORPO_GESTOS_E_MOVIMENTOS', bncc: 'Experimentar as possibilidades corporais nas brincadeiras e interações em ambientes acolhedores e desafiantes.', curriculo: 'Experimentar as possibilidades corporais nas brincadeiras e interações em ambientes acolhedores e desafiantes.', intencionalidade: 'Estimular a exploração do corpo em diferentes posições e movimentos, respeitando o ritmo individual dos bebês.' },
  EI01CG03: { campo: 'CORPO_GESTOS_E_MOVIMENTOS', bncc: 'Desenvolver o controle progressivo do próprio corpo em diferentes situações.', curriculo: 'Desenvolver progressivamente o controle do próprio corpo em situações cotidianas.', intencionalidade: 'Favorecer o desenvolvimento motor progressivo dos bebês por meio de experiências variadas.' },
  EI01TS01: { campo: 'TRACOS_SONS_CORES_E_FORMAS', bncc: 'Explorar sons produzidos com o próprio corpo e com objetos do ambiente.', curriculo: 'Escutar diferentes fontes sonoras: corpo, natureza, objetos cotidianos e materiais reutilizáveis.', intencionalidade: 'Ampliar a escuta e a percepção auditiva dos bebês por meio de diferentes fontes sonoras presentes no cotidiano.' },
  EI01TS02: { campo: 'TRACOS_SONS_CORES_E_FORMAS', bncc: 'Manipular materiais diversos e variados para explorar cores, formas, texturas e sons.', curriculo: 'Manusear objetos e brinquedos coloridos.', intencionalidade: 'Ampliar a percepção visual e o interesse pelas cores por meio da exploração ativa de objetos.' },
  EI01TS03: { campo: 'TRACOS_SONS_CORES_E_FORMAS', bncc: 'Explorar cores, texturas e materiais diversos por meio de experiências sensoriais.', curriculo: 'Tatear tintas coloridas.', intencionalidade: 'Proporcionar experiências sensoriais com cores e texturas, favorecendo a exploração livre e o interesse visual.' },
  EI01EF01: { campo: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', bncc: 'Comunicar-se com outras pessoas usando movimentos, gestos, balbucios, fala e outras formas de expressão.', curriculo: 'Comunicar-se com outras pessoas usando movimentos, gestos, balbucios, fala e outras formas de expressão.', intencionalidade: 'Favorecer a retomada das interações estimulando a comunicação dos bebês em situações significativas do cotidiano.' },
  EI01EF02: { campo: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', bncc: 'Imitar sons e palavras ouvidas.', curriculo: 'Imitar sons e palavras ouvidas.', intencionalidade: 'Incentivar a imitação como estratégia inicial de comunicação e desenvolvimento da oralidade dos bebês.' },
  EI01EF03: { campo: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', bncc: 'Demonstrar interesse ao ouvir a leitura de poemas e a apresentação de músicas.', curriculo: 'Demonstrar interesse ao ouvir a leitura de poemas e apresentação de músicas.', intencionalidade: 'Desenvolver a escuta, a atenção e o prazer em situações de leitura e musicalização.' },
  EI01EF04: { campo: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', bncc: 'Reconhecer quando é chamado por seu nome e reconhecer os nomes das pessoas com quem convive.', curriculo: 'Reconhecer quando é chamado por seu nome e reconhecer os nomes das pessoas com quem convive.', intencionalidade: 'Fortalecer a identidade do bebê e o vínculo com os adultos e pares por meio do reconhecimento do nome.' },
  EI01ET01: { campo: 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', bncc: 'Explorar o ambiente pela ação e observação, manipulando, experimentando e fazendo descobertas.', curriculo: 'Explorar o ambiente pela ação e observação, manipulando, experimentando e fazendo descobertas.', intencionalidade: 'Incentivar a curiosidade e a exploração ativa dos espaços e objetos do cotidiano escolar.' },
  EI01ET02: { campo: 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', bncc: 'Manipular e experimentar o espaço por meio de deslocamentos do próprio corpo e dos objetos.', curriculo: 'Manipular e experimentar o espaço por meio de experiências de deslocamento de si e dos objetos.', intencionalidade: 'Incentivar a exploração do espaço e o deslocamento corporal, ampliando a percepção espacial dos bebês.' },
  EI01ET03: { campo: 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', bncc: 'Explorar os espaços da instituição de Educação Infantil.', curriculo: 'Explorar os espaços da instituição de Educação Infantil.', intencionalidade: 'Ampliar o reconhecimento e a familiaridade dos bebês com os diferentes espaços da instituição, promovendo segurança e curiosidade.' },
  EI01ET06: { campo: 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', bncc: 'Perceber quantidades em situações do cotidiano.', curriculo: 'Perceber quantidades distintas em relação aos brinquedos, livros, entre outros materiais.', intencionalidade: 'Introduzir noções iniciais de quantidade por meio da observação e comparação de objetos no cotidiano.' },

  // EI02 – CRIANÇAS BEM PEQUENAS (19–47 meses)
  EI02EO01: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos.', curriculo: 'Demonstrar atitudes de cuidado e solidariedade na interação com crianças de diferentes faixas etárias e com adultos.', intencionalidade: 'Desenvolver atitudes de empatia, cuidado e convivência respeitosa.' },
  EI02EO02: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Demonstrar imagem positiva de si e confiança em sua capacidade para enfrentar dificuldades e desafios.', curriculo: 'Perceber sua imagem no espelho e em diferentes fotografias. Demonstrar imagem positiva de si e confiança em sua capacidade para enfrentar dificuldades e desafios.', intencionalidade: 'Favorecer a construção da identidade pessoal e o reconhecimento de si. Fortalecer a autoestima e a confiança diante de desafios cotidianos.' },
  EI02EO03: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Compartilhar os objetos e o espaço com outras crianças.', curriculo: 'Compartilhar objetos e espaços com crianças e adultos.', intencionalidade: 'Favorecer experiências coletivas de partilha e convivência democrática.' },
  EI02EO04: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Comunicar-se com outras crianças e adultos e expressar seus desejos, necessidades, sentimentos e opiniões.', curriculo: 'Comunicar-se com outras crianças e adultos expressando desejos, necessidades, sentimentos e opiniões.', intencionalidade: 'Ampliar a capacidade comunicativa das crianças em situações do cotidiano.' },
  EI02EO05: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Perceber que as pessoas têm características físicas diferentes e interesse em conhecê-las.', curriculo: 'Perceber que as pessoas têm características físicas diferentes, valorizando e respeitando essas diferenças.', intencionalidade: 'Promover o respeito às diferenças e à diversidade desde a primeira infância.' },
  EI02EO06: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Respeitar regras básicas de convívio social nas interações e brincadeiras.', curriculo: 'Conhecer, utilizar e negociar regras básicas de convívio social nas interações, nas brincadeiras e no uso de espaços diversos.', intencionalidade: 'Desenvolver convivência ética e participação em regras coletivas.' },
  EI02EO07: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Resolver conflitos nas interações cotidianas com adultos e crianças.', curriculo: 'Resolver conflitos nas interações cotidianas com crianças e adultos, utilizando recursos da linguagem e negociação.', intencionalidade: 'Mediar conflitos com estratégias de comunicação e negociação adequadas à faixa etária.' },
  EI02CG01: { campo: 'CORPO_GESTOS_E_MOVIMENTOS', bncc: 'Apropriar-se de gestos e movimentos de sua cultura no cuidado de si e nos jogos e brincadeiras.', curriculo: 'Apropriar-se de gestos e movimentos de sua cultura no cuidado de si e nos jogos e brincadeiras.', intencionalidade: 'Valorizar os gestos e movimentos da cultura local nas brincadeiras e no autocuidado.' },
  EI02CG02: { campo: 'CORPO_GESTOS_E_MOVIMENTOS', bncc: 'Deslocar seu corpo no espaço, orientando-se por noções como em frente, atrás, no alto, embaixo, dentro, fora etc.', curriculo: 'Deslocar seu corpo no espaço, orientando-se por noções como em frente, atrás, no alto, embaixo, dentro, fora etc.', intencionalidade: 'Desenvolver a orientação espacial por meio de experiências corporais lúdicas.' },
  EI02CG03: { campo: 'CORPO_GESTOS_E_MOVIMENTOS', bncc: 'Explorar formas de deslocamento no espaço (ziguezaguear, correr, pular etc.), combinando movimentos e seguindo orientações.', curriculo: 'Explorar formas de deslocamento no espaço combinando movimentos variados.', intencionalidade: 'Ampliar o repertório motor por meio de brincadeiras que envolvem diferentes formas de deslocamento.' },
  EI02CG04: { campo: 'CORPO_GESTOS_E_MOVIMENTOS', bncc: 'Demonstrar progressiva independência no cuidado do seu corpo.', curriculo: 'Observar e nomear as diversas expressões corporais, possibilitando a familiarização com a imagem de seu próprio corpo refletida no espelho. Demonstrar progressiva independência no cuidado do seu corpo.', intencionalidade: 'Promover a autonomia progressiva nas atividades de higiene e autocuidado.' },
  EI02CG05: { campo: 'CORPO_GESTOS_E_MOVIMENTOS', bncc: 'Desenvolver habilidades para trabalhar com materiais de diferentes pesos e texturas.', curriculo: 'Desenvolver habilidades motoras finas ao trabalhar com materiais de diferentes pesos, tamanhos e texturas.', intencionalidade: 'Estimular a motricidade fina por meio de experiências com materiais diversificados.' },
  EI02TS01: { campo: 'TRACOS_SONS_CORES_E_FORMAS', bncc: 'Criar sons com materiais, objetos e instrumentos musicais para acompanhar diversos ritmos de música.', curriculo: 'Criar sons com materiais, objetos e instrumentos musicais para acompanhar diversos ritmos de música.', intencionalidade: 'Desenvolver a percepção rítmica e a expressão musical por meio da criação sonora.' },
  EI02TS02: { campo: 'TRACOS_SONS_CORES_E_FORMAS', bncc: 'Utilizar materiais variados com possibilidades de manipulação, explorando cores, superfícies, texturas, formas e volumes ao criar objetos tridimensionais.', curriculo: 'Utilizar materiais variados com possibilidades de manipulação, explorando cores, superfícies, texturas, formas e volumes ao criar objetos tridimensionais.', intencionalidade: 'Proporcionar experiências plásticas variadas que estimulem a criatividade e a exploração sensorial.' },
  EI02TS03: { campo: 'TRACOS_SONS_CORES_E_FORMAS', bncc: 'Utilizar diferentes fontes sonoras disponíveis no ambiente em brincadeiras cantadas, canções, músicas e melodias.', curriculo: 'Utilizar diferentes fontes sonoras disponíveis no ambiente em brincadeiras cantadas, canções, músicas e melodias.', intencionalidade: 'Ampliar o repertório musical e a expressividade das crianças por meio de brincadeiras cantadas.' },
  EI02EF01: { campo: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', bncc: 'Dialogar com crianças e adultos, expressando seus desejos, necessidades, sentimentos e opiniões.', curriculo: 'Dialogar com crianças e adultos, expressando seus desejos, necessidades, sentimentos e opiniões.', intencionalidade: 'Favorecer o desenvolvimento da linguagem oral em situações de diálogo genuíno.' },
  EI02EF02: { campo: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', bncc: 'Identificar e criar diferentes sons e reconhecer rimas e aliterações em cantigas de roda e textos poéticos.', curriculo: 'Identificar e criar diferentes sons e reconhecer rimas e aliterações em cantigas de roda e textos poéticos.', intencionalidade: 'Despertar o interesse pela linguagem poética e musical, favorecendo a consciência fonológica.' },
  EI02EF03: { campo: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', bncc: 'Demonstrar interesse e atenção ao ouvir histórias lidas ou contadas, manifestando reações de surpresa, satisfação, questionamento.', curriculo: 'Demonstrar interesse e atenção ao ouvir histórias lidas ou contadas, manifestando reações de surpresa, satisfação, questionamento.', intencionalidade: 'Desenvolver o prazer pela leitura e o interesse pelas narrativas.' },
  EI02EF04: { campo: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', bncc: 'Formular e responder perguntas sobre fatos da história narrada, identificando cenários, personagens e principais acontecimentos.', curriculo: 'Formular e responder perguntas sobre fatos da história narrada, identificando cenários, personagens e principais acontecimentos.', intencionalidade: 'Desenvolver a compreensão narrativa e o raciocínio sequencial por meio de histórias.' },
  EI02ET01: { campo: 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', bncc: 'Dialogar com crianças e adultos e reconhecer suas próprias preferências e as das outras pessoas.', curriculo: 'Dialogar com crianças e adultos sobre suas preferências, possibilidades e necessidades.', intencionalidade: 'Ampliar o autoconhecimento e o reconhecimento do outro por meio do diálogo.' },
  EI02ET04: { campo: 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', bncc: 'Identificar relações espaciais (dentro e fora, em cima, embaixo, acima, abaixo, entre e do lado) e temporais (antes, durante e depois).', curriculo: 'Identificar relações espaciais e temporais em situações cotidianas.', intencionalidade: 'Introduzir noções de espaço e tempo de forma concreta e significativa.' },
  EI02ET05: { campo: 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', bncc: 'Classificar objetos, considerando determinado atributo (tamanho, peso, cor, forma etc.).', curriculo: 'Classificar objetos, considerando determinado atributo (tamanho, peso, cor, forma etc.).', intencionalidade: 'Desenvolver o pensamento lógico-matemático por meio de atividades de classificação e comparação.' },

  // EI03 – CRIANÇAS PEQUENAS (48–71 meses)
  EI03EO01: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Demonstrar empatia pelos outros, percebendo que as pessoas têm diferentes sentimentos, necessidades e maneiras de pensar e agir.', curriculo: 'Demonstrar empatia pelos outros, percebendo que as pessoas têm diferentes sentimentos, necessidades e maneiras de pensar e agir.', intencionalidade: 'Desenvolver a empatia e o respeito às diferenças individuais na convivência coletiva.' },
  EI03EO02: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Agir de maneira independente com confiança em suas capacidades, reconhecendo suas conquistas e limitações.', curriculo: 'Agir de maneira independente com confiança em suas capacidades, reconhecendo suas conquistas e limitações.', intencionalidade: 'Fortalecer a autonomia e a autoconfiança das crianças diante de desafios.' },
  EI03EO03: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Ampliar as relações interpessoais, desenvolvendo atitudes de participação e cooperação.', curriculo: 'Ampliar as relações interpessoais, desenvolvendo atitudes de participação e cooperação.', intencionalidade: 'Promover atitudes de cooperação e participação coletiva em situações de grupo.' },
  EI03EO04: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Comunicar suas ideias e sentimentos a pessoas e grupos diversos.', curriculo: 'Comunicar suas ideias e sentimentos a pessoas e grupos diversos.', intencionalidade: 'Ampliar a capacidade de expressão e comunicação das crianças em diferentes contextos.' },
  EI03EO05: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Demonstrar valorização das características de seu corpo e da sua pertença étnico-racial.', curriculo: 'Demonstrar valorização das características de seu corpo e sua pertença étnico-racial, na relação com os outros.', intencionalidade: 'Promover o autoconhecimento, a valorização da identidade e o respeito à diversidade.' },
  EI03EO06: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Manifestar interesse e respeito por diferentes culturas e modos de vida.', curriculo: 'Manifestar interesse e respeito por diferentes culturas e modos de vida.', intencionalidade: 'Desenvolver o senso de pertencimento e o respeito à diversidade cultural.' },
  EI03EO07: { campo: 'O_EU_O_OUTRO_E_O_NOS', bncc: 'Usar estratégias pautadas no respeito mútuo para lidar com conflitos nas interações com crianças e adultos.', curriculo: 'Usar estratégias pautadas no respeito mútuo para lidar com conflitos nas interações com crianças e adultos.', intencionalidade: 'Desenvolver habilidades de resolução pacífica de conflitos com base no diálogo e no respeito.' },
  EI03CG01: { campo: 'CORPO_GESTOS_E_MOVIMENTOS', bncc: 'Criar com o corpo formas diversificadas de expressão de sentimentos, sensações e emoções, tanto nas situações do cotidiano quanto em brincadeiras, dança, teatro, música.', curriculo: 'Criar com o corpo formas diversificadas de expressão de sentimentos, sensações e emoções.', intencionalidade: 'Estimular a criatividade e a expressão corporal como formas de comunicação e arte.' },
  EI03CG02: { campo: 'CORPO_GESTOS_E_MOVIMENTOS', bncc: 'Demonstrar controle e adequação do uso de seu corpo em brincadeiras e jogos, escuta e reconto de histórias, atividades artísticas, entre outras possibilidades.', curriculo: 'Demonstrar controle e adequação do uso de seu corpo em brincadeiras e jogos, escuta e reconto de histórias, atividades artísticas, entre outras possibilidades.', intencionalidade: 'Desenvolver o autocontrole corporal em diferentes situações e contextos pedagógicos.' },
  EI03CG03: { campo: 'CORPO_GESTOS_E_MOVIMENTOS', bncc: 'Criar movimentos, gestos, olhares e mímicas com o corpo em situações de representação.', curriculo: 'Criar movimentos, gestos, olhares e mímicas com o corpo em situações de representação.', intencionalidade: 'Estimular a expressividade e a criatividade corporal em situações de jogo simbólico e teatro.' },
  EI03CG04: { campo: 'CORPO_GESTOS_E_MOVIMENTOS', bncc: 'Adotar hábitos de autocuidado relacionados a higiene, alimentação, conforto e aparência.', curriculo: 'Adotar hábitos de autocuidado relacionados a higiene, alimentação, conforto e aparência.', intencionalidade: 'Consolidar hábitos de autonomia e autocuidado na rotina diária.' },
  EI03CG05: { campo: 'CORPO_GESTOS_E_MOVIMENTOS', bncc: 'Coordenar suas habilidades manuais no atendimento adequado a seus interesses e necessidades em situações diversas.', curriculo: 'Coordenar suas habilidades manuais no atendimento adequado a seus interesses e necessidades em situações diversas.', intencionalidade: 'Desenvolver a coordenação motora fina em atividades de vida prática e expressão artística.' },
  EI03TS01: { campo: 'TRACOS_SONS_CORES_E_FORMAS', bncc: 'Utilizar sons produzidos por materiais, objetos e instrumentos musicais durante brincadeiras de faz de conta, encenações, criações musicais, festas.', curriculo: 'Utilizar sons produzidos por materiais, objetos e instrumentos musicais durante brincadeiras de faz de conta, encenações, criações musicais, festas.', intencionalidade: 'Ampliar o repertório musical e o uso criativo dos sons nas brincadeiras e produções coletivas.' },
  EI03TS02: { campo: 'TRACOS_SONS_CORES_E_FORMAS', bncc: 'Expressar-se livremente por meio de desenho, pintura, colagem, dobradura e escultura, criando produções bidimensionais e tridimensionais.', curriculo: 'Valorizar e criar produções artísticas individuais e coletivas.', intencionalidade: 'Estimular a criatividade e a expressão artística livre por meio de diferentes linguagens visuais.' },
  EI03TS03: { campo: 'TRACOS_SONS_CORES_E_FORMAS', bncc: 'Reconhecer as qualidades do som (intensidade, duração, altura e timbre), utilizando-as em suas produções sonoras e ao ouvir músicas e sons.', curriculo: 'Reconhecer as qualidades do som utilizando-as em suas produções sonoras e ao ouvir músicas e sons.', intencionalidade: 'Desenvolver a percepção musical e a apreciação estética por meio da escuta ativa.' },
  EI03EF01: { campo: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', bncc: 'Expressar ideias, desejos e sentimentos sobre suas vivências, por meio da linguagem oral e escrita (escrita espontânea), de fotos, desenhos e outras formas de expressão.', curriculo: 'Expressar ideias, desejos e sentimentos sobre suas vivências, por meio da linguagem oral e de outras formas de expressão.', intencionalidade: 'Ampliar as formas de expressão e comunicação das crianças em diferentes linguagens.' },
  EI03EF02: { campo: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', bncc: 'Inventar brincadeiras cantadas, poemas e canções, criando rimas, aliterações e ritmos.', curriculo: 'Inventar brincadeiras cantadas, poemas e canções, criando rimas, aliterações e ritmos.', intencionalidade: 'Desenvolver a criatividade linguística e a consciência fonológica por meio de jogos verbais.' },
  EI03EF03: { campo: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', bncc: 'Escolher e folhear livros, procurando orientar-se por temas e ilustrações e tentando identificar palavras conhecidas.', curriculo: 'Escolher e folhear livros, procurando orientar-se por temas e ilustrações e tentando identificar palavras conhecidas.', intencionalidade: 'Desenvolver o comportamento leitor e o interesse pelos livros e pela leitura.' },
  EI03EF04: { campo: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', bncc: 'Recontar histórias ouvidas e planejar coletivamente roteiros de vídeos e de encenações, definindo os contextos, os personagens, a estrutura da história.', curriculo: 'Recontar histórias ouvidas e planejar coletivamente roteiros de vídeos e de encenações.', intencionalidade: 'Desenvolver a memória narrativa, a sequência lógica e a criatividade na recriação de histórias.' },
  EI03ET01: { campo: 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', bncc: 'Estabelecer relações de comparação entre objetos, observando suas propriedades.', curriculo: 'Estabelecer relações de comparação entre objetos, observando suas propriedades.', intencionalidade: 'Desenvolver o raciocínio lógico-matemático por meio de comparações e classificações.' },
  EI03ET02: { campo: 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', bncc: 'Observar e descrever mudanças em diferentes materiais, resultantes de ações sobre eles, em experimentos envolvendo fenômenos naturais e artificiais.', curriculo: 'Observar e descrever mudanças em diferentes materiais, resultantes de ações sobre eles, em experimentos envolvendo fenômenos naturais e artificiais.', intencionalidade: 'Estimular a curiosidade científica por meio da observação e experimentação.' },
  EI03ET03: { campo: 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', bncc: 'Identificar e selecionar fontes de informações, para responder a questões sobre a natureza, seus fenômenos, sua conservação.', curriculo: 'Identificar e selecionar fontes de informações sobre a natureza, seus fenômenos e conservação.', intencionalidade: 'Desenvolver a capacidade investigativa e o interesse pelo ambiente natural.' },
  EI03ET04: { campo: 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', bncc: 'Registrar observações, manipulações e medidas, usando múltiplas linguagens (desenho, registro por números ou escrita espontânea), em diferentes suportes.', curriculo: 'Registrar observações e descobertas usando múltiplas linguagens.', intencionalidade: 'Desenvolver a documentação das experiências de forma multimodal e criativa.' },
};

// ─── Sequência de objetivos por data (extraída da Matriz 2026) ───────────────
// Formato: { date: 'YYYY-MM-DD', bimestre: N, code: 'EI0xXXxx' }
// Esta lista define a ordem e os objetivos por data letiva para cada segmento.

const SEQUENCE_EI02 = [
  // 1º Bimestre
  { date: '2026-02-09', bimestre: 1, code: 'EI02EO02' },
  { date: '2026-02-10', bimestre: 1, code: 'EI02EO06' },
  { date: '2026-02-11', bimestre: 1, code: 'EI02CG03' },
  { date: '2026-02-12', bimestre: 1, code: 'EI02EF01' },
  { date: '2026-02-13', bimestre: 1, code: 'EI02TS03' },
  { date: '2026-02-19', bimestre: 1, code: 'EI02EF02' },
  { date: '2026-02-20', bimestre: 1, code: 'EI02ET01' },
  { date: '2026-02-23', bimestre: 1, code: 'EI02EO01' },
  { date: '2026-02-24', bimestre: 1, code: 'EI02CG04' },
  { date: '2026-02-25', bimestre: 1, code: 'EI02TS01' },
  { date: '2026-02-26', bimestre: 1, code: 'EI02EF01' },
  { date: '2026-02-27', bimestre: 1, code: 'EI02ET05' },
  { date: '2026-03-02', bimestre: 1, code: 'EI02EO02' },
  { date: '2026-03-03', bimestre: 1, code: 'EI02CG04' },
  { date: '2026-03-04', bimestre: 1, code: 'EI02TS03' },
  { date: '2026-03-05', bimestre: 1, code: 'EI02EF01' },
  { date: '2026-03-06', bimestre: 1, code: 'EI02ET04' },
  { date: '2026-03-09', bimestre: 1, code: 'EI02EO05' },
  { date: '2026-03-10', bimestre: 1, code: 'EI02CG05' },
  { date: '2026-03-11', bimestre: 1, code: 'EI02TS02' },
  { date: '2026-03-12', bimestre: 1, code: 'EI02EF03' },
  { date: '2026-03-13', bimestre: 1, code: 'EI02ET05' },
  { date: '2026-03-16', bimestre: 1, code: 'EI02EO06' },
  { date: '2026-03-17', bimestre: 1, code: 'EI02CG01' },
  { date: '2026-03-18', bimestre: 1, code: 'EI02TS01' },
  { date: '2026-03-19', bimestre: 1, code: 'EI02EF04' },
  { date: '2026-03-20', bimestre: 1, code: 'EI02ET05' },
  { date: '2026-03-23', bimestre: 1, code: 'EI02EO03' },
  { date: '2026-03-24', bimestre: 1, code: 'EI02CG02' },
  { date: '2026-03-26', bimestre: 1, code: 'EI02TS03' },
  { date: '2026-03-27', bimestre: 1, code: 'EI02ET01' },
  { date: '2026-03-30', bimestre: 1, code: 'EI02EO04' },
  { date: '2026-03-31', bimestre: 1, code: 'EI02CG04' },
  { date: '2026-04-01', bimestre: 1, code: 'EI02TS02' },
  { date: '2026-04-02', bimestre: 1, code: 'EI02EF01' },
  { date: '2026-04-03', bimestre: 1, code: 'EI02ET04' },
  { date: '2026-04-06', bimestre: 1, code: 'EI02EO01' },
  { date: '2026-04-07', bimestre: 1, code: 'EI02CG03' },
  { date: '2026-04-08', bimestre: 1, code: 'EI02TS03' },
  { date: '2026-04-09', bimestre: 1, code: 'EI02EF02' },
  { date: '2026-04-17', bimestre: 1, code: 'EI02EO07' },
  { date: '2026-04-20', bimestre: 1, code: 'EI02EO02' },
  { date: '2026-04-22', bimestre: 1, code: 'EI02CG05' },
  { date: '2026-04-23', bimestre: 1, code: 'EI02TS01' },
  { date: '2026-04-24', bimestre: 1, code: 'EI02EF03' },
  { date: '2026-04-27', bimestre: 1, code: 'EI02ET05' },
  // 2º Bimestre
  { date: '2026-04-29', bimestre: 2, code: 'EI02EO05' },
  { date: '2026-04-30', bimestre: 2, code: 'EI02CG04' },
  { date: '2026-05-04', bimestre: 2, code: 'EI02EO01' },
  { date: '2026-05-05', bimestre: 2, code: 'EI02CG01' },
  { date: '2026-05-06', bimestre: 2, code: 'EI02TS02' },
  { date: '2026-05-07', bimestre: 2, code: 'EI02EF04' },
  { date: '2026-05-08', bimestre: 2, code: 'EI02ET05' },
  { date: '2026-05-11', bimestre: 2, code: 'EI02EO06' },
  { date: '2026-05-12', bimestre: 2, code: 'EI02CG02' },
  { date: '2026-05-13', bimestre: 2, code: 'EI02TS03' },
  { date: '2026-05-14', bimestre: 2, code: 'EI02EF01' },
  { date: '2026-05-15', bimestre: 2, code: 'EI02ET04' },
  { date: '2026-05-18', bimestre: 2, code: 'EI02EO03' },
  { date: '2026-05-19', bimestre: 2, code: 'EI02CG05' },
  { date: '2026-05-20', bimestre: 2, code: 'EI02TS01' },
  { date: '2026-05-21', bimestre: 2, code: 'EI02EF02' },
  { date: '2026-05-22', bimestre: 2, code: 'EI02ET01' },
  { date: '2026-05-25', bimestre: 2, code: 'EI02EO04' },
  { date: '2026-05-26', bimestre: 2, code: 'EI02CG03' },
  { date: '2026-05-27', bimestre: 2, code: 'EI02TS02' },
  { date: '2026-05-28', bimestre: 2, code: 'EI02EF03' },
  { date: '2026-05-29', bimestre: 2, code: 'EI02ET05' },
  { date: '2026-06-01', bimestre: 2, code: 'EI02EO07' },
  { date: '2026-06-02', bimestre: 2, code: 'EI02CG04' },
  { date: '2026-06-03', bimestre: 2, code: 'EI02TS03' },
  { date: '2026-06-04', bimestre: 2, code: 'EI02EF01' },
  { date: '2026-06-05', bimestre: 2, code: 'EI02ET04' },
  // 3º Bimestre
  { date: '2026-07-27', bimestre: 3, code: 'EI02EO01' },
  { date: '2026-07-28', bimestre: 3, code: 'EI02CG01' },
  { date: '2026-07-29', bimestre: 3, code: 'EI02TS01' },
  { date: '2026-07-30', bimestre: 3, code: 'EI02EF04' },
  { date: '2026-07-31', bimestre: 3, code: 'EI02ET05' },
  { date: '2026-08-03', bimestre: 3, code: 'EI02EO02' },
  { date: '2026-08-04', bimestre: 3, code: 'EI02CG02' },
  { date: '2026-08-05', bimestre: 3, code: 'EI02TS02' },
  { date: '2026-08-06', bimestre: 3, code: 'EI02EF01' },
  { date: '2026-08-07', bimestre: 3, code: 'EI02ET04' },
  { date: '2026-08-10', bimestre: 3, code: 'EI02EO05' },
  { date: '2026-08-11', bimestre: 3, code: 'EI02CG03' },
  { date: '2026-08-12', bimestre: 3, code: 'EI02TS03' },
  { date: '2026-08-13', bimestre: 3, code: 'EI02EF02' },
  { date: '2026-08-14', bimestre: 3, code: 'EI02ET01' },
  // 4º Bimestre
  { date: '2026-10-01', bimestre: 4, code: 'EI02EO06' },
  { date: '2026-10-02', bimestre: 4, code: 'EI02CG05' },
  { date: '2026-10-05', bimestre: 4, code: 'EI02TS01' },
  { date: '2026-10-06', bimestre: 4, code: 'EI02EF03' },
  { date: '2026-10-07', bimestre: 4, code: 'EI02ET05' },
];

const SEQUENCE_EI03 = [
  // 1º Bimestre
  { date: '2026-02-09', bimestre: 1, code: 'EI03EO01' },
  { date: '2026-02-10', bimestre: 1, code: 'EI03CG01' },
  { date: '2026-02-11', bimestre: 1, code: 'EI03TS02' },
  { date: '2026-02-12', bimestre: 1, code: 'EI03EF01' },
  { date: '2026-02-13', bimestre: 1, code: 'EI03EF02' },
  { date: '2026-02-19', bimestre: 1, code: 'EI03EF03' },
  { date: '2026-02-20', bimestre: 1, code: 'EI03ET02' },
  { date: '2026-02-23', bimestre: 1, code: 'EI03EO02' },
  { date: '2026-02-24', bimestre: 1, code: 'EI03CG02' },
  { date: '2026-02-25', bimestre: 1, code: 'EI03TS01' },
  { date: '2026-02-26', bimestre: 1, code: 'EI03EF04' },
  { date: '2026-02-27', bimestre: 1, code: 'EI03ET01' },
  { date: '2026-03-02', bimestre: 1, code: 'EI03EO03' },
  { date: '2026-03-03', bimestre: 1, code: 'EI03CG03' },
  { date: '2026-03-04', bimestre: 1, code: 'EI03TS03' },
  { date: '2026-03-05', bimestre: 1, code: 'EI03EF01' },
  { date: '2026-03-06', bimestre: 1, code: 'EI03ET01' },
  { date: '2026-03-09', bimestre: 1, code: 'EI03EO04' },
  { date: '2026-03-10', bimestre: 1, code: 'EI03CG04' },
  { date: '2026-03-11', bimestre: 1, code: 'EI03TS02' },
  { date: '2026-03-12', bimestre: 1, code: 'EI03EF02' },
  { date: '2026-03-13', bimestre: 1, code: 'EI03ET02' },
  { date: '2026-03-16', bimestre: 1, code: 'EI03EO05' },
  { date: '2026-03-17', bimestre: 1, code: 'EI03CG05' },
  { date: '2026-03-18', bimestre: 1, code: 'EI03TS01' },
  { date: '2026-03-19', bimestre: 1, code: 'EI03EF03' },
  { date: '2026-03-20', bimestre: 1, code: 'EI03ET03' },
  { date: '2026-03-23', bimestre: 1, code: 'EI03EO06' },
  { date: '2026-03-24', bimestre: 1, code: 'EI03CG01' },
  { date: '2026-03-26', bimestre: 1, code: 'EI03TS03' },
  { date: '2026-03-27', bimestre: 1, code: 'EI03ET01' },
  { date: '2026-03-30', bimestre: 1, code: 'EI03EO07' },
  { date: '2026-03-31', bimestre: 1, code: 'EI03CG02' },
  { date: '2026-04-01', bimestre: 1, code: 'EI03TS02' },
  { date: '2026-04-02', bimestre: 1, code: 'EI03EF04' },
  { date: '2026-04-03', bimestre: 1, code: 'EI03ET04' },
  { date: '2026-04-06', bimestre: 1, code: 'EI03EO01' },
  { date: '2026-04-07', bimestre: 1, code: 'EI03CG03' },
  { date: '2026-04-08', bimestre: 1, code: 'EI03TS01' },
  { date: '2026-04-09', bimestre: 1, code: 'EI03EF01' },
  { date: '2026-04-17', bimestre: 1, code: 'EI03EO02' },
  { date: '2026-04-20', bimestre: 1, code: 'EI03CG05' },
  { date: '2026-04-22', bimestre: 1, code: 'EI03TS02' },
  { date: '2026-04-23', bimestre: 1, code: 'EI03EF02' },
  { date: '2026-04-24', bimestre: 1, code: 'EI03ET02' },
  { date: '2026-04-27', bimestre: 1, code: 'EI03ET01' },
  // 2º Bimestre
  { date: '2026-04-29', bimestre: 2, code: 'EI03EO03' },
  { date: '2026-04-30', bimestre: 2, code: 'EI03CG04' },
  { date: '2026-05-04', bimestre: 2, code: 'EI03EO04' },
  { date: '2026-05-05', bimestre: 2, code: 'EI03CG01' },
  { date: '2026-05-06', bimestre: 2, code: 'EI03TS03' },
  { date: '2026-05-07', bimestre: 2, code: 'EI03EF03' },
  { date: '2026-05-08', bimestre: 2, code: 'EI03ET03' },
  { date: '2026-05-11', bimestre: 2, code: 'EI03EO05' },
  { date: '2026-05-12', bimestre: 2, code: 'EI03CG02' },
  { date: '2026-05-13', bimestre: 2, code: 'EI03TS01' },
  { date: '2026-05-14', bimestre: 2, code: 'EI03EF04' },
  { date: '2026-05-15', bimestre: 2, code: 'EI03ET01' },
  { date: '2026-05-18', bimestre: 2, code: 'EI03EO06' },
  { date: '2026-05-19', bimestre: 2, code: 'EI03CG05' },
  { date: '2026-05-20', bimestre: 2, code: 'EI03TS02' },
  { date: '2026-05-21', bimestre: 2, code: 'EI03EF01' },
  { date: '2026-05-22', bimestre: 2, code: 'EI03ET04' },
  // 3º Bimestre
  { date: '2026-07-27', bimestre: 3, code: 'EI03EO07' },
  { date: '2026-07-28', bimestre: 3, code: 'EI03CG03' },
  { date: '2026-07-29', bimestre: 3, code: 'EI03TS03' },
  { date: '2026-07-30', bimestre: 3, code: 'EI03EF02' },
  { date: '2026-07-31', bimestre: 3, code: 'EI03ET02' },
  { date: '2026-08-03', bimestre: 3, code: 'EI03EO01' },
  { date: '2026-08-04', bimestre: 3, code: 'EI03CG01' },
  { date: '2026-08-05', bimestre: 3, code: 'EI03TS01' },
  { date: '2026-08-06', bimestre: 3, code: 'EI03EF03' },
  { date: '2026-08-07', bimestre: 3, code: 'EI03ET01' },
  { date: '2026-08-10', bimestre: 3, code: 'EI03EO02' },
  { date: '2026-08-11', bimestre: 3, code: 'EI03CG04' },
  { date: '2026-08-12', bimestre: 3, code: 'EI03TS02' },
  { date: '2026-08-13', bimestre: 3, code: 'EI03EF04' },
  { date: '2026-08-14', bimestre: 3, code: 'EI03ET03' },
  // 4º Bimestre
  { date: '2026-10-01', bimestre: 4, code: 'EI03EO03' },
  { date: '2026-10-02', bimestre: 4, code: 'EI03CG05' },
  { date: '2026-10-05', bimestre: 4, code: 'EI03TS03' },
  { date: '2026-10-06', bimestre: 4, code: 'EI03EF01' },
  { date: '2026-10-07', bimestre: 4, code: 'EI03ET04' },
];

// ─── Funções auxiliares ────────────────────────────────────────────────────────

function getDayOfWeek(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const dow = d.getUTCDay(); // 0=Dom, 1=Seg, ..., 6=Sab
  return dow === 0 ? 7 : dow; // converte para 1=Seg..7=Dom
}

function getWeekOfYear(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const diff = d - start;
  return Math.ceil((diff / 86400000 + start.getUTCDay() + 1) / 7);
}

function buildEntry(seq, matrixId) {
  const obj = OBJECTIVES[seq.code];
  if (!obj) {
    console.warn(`  ⚠️  Objetivo não mapeado: ${seq.code}`);
    return null;
  }
  const dateObj = new Date(seq.date + 'T12:00:00Z');
  return {
    matrixId,
    date: dateObj,
    weekOfYear: getWeekOfYear(seq.date),
    dayOfWeek: getDayOfWeek(seq.date),
    bimester: seq.bimestre,
    campoDeExperiencia: obj.campo,
    objetivoBNCC: obj.bncc,
    objetivoBNCCCode: seq.code,
    objetivoCurriculo: obj.curriculo,
    intencionalidade: obj.intencionalidade,
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function seedSegment(segment, sequence, mantenedoraId) {
  const tag = DRY_RUN ? '[DRY-RUN] ' : '';
  console.log(`\n${tag}Populando ${segment}...`);

  // Buscar matriz ativa do segmento
  const matrix = await prisma.curriculumMatrix.findFirst({
    where: { mantenedoraId, year: YEAR, segment, isActive: true },
  });

  if (!matrix) {
    console.error(`  ❌ Matriz ${segment} não encontrada. Execute ensure-matriz-segments.js primeiro.`);
    return;
  }

  console.log(`  Matriz: "${matrix.name}" (${matrix.id})`);

  // Verificar entries existentes
  const existingCount = await prisma.curriculumMatrixEntry.count({
    where: { matrixId: matrix.id },
  });
  const wrongCount = await prisma.curriculumMatrixEntry.count({
    where: {
      matrixId: matrix.id,
      NOT: { objetivoBNCCCode: { startsWith: segment } },
    },
  });

  console.log(`  Entries existentes: ${existingCount} (${wrongCount} com código errado)`);

  if (wrongCount > 0) {
    console.log(`  Removendo ${wrongCount} entries com código errado...`);
    if (!DRY_RUN) {
      await prisma.curriculumMatrixEntry.deleteMany({
        where: {
          matrixId: matrix.id,
          NOT: { objetivoBNCCCode: { startsWith: segment } },
        },
      });
    }
  }

  // Buscar dates já existentes (com código correto)
  const existingDates = await prisma.curriculumMatrixEntry.findMany({
    where: { matrixId: matrix.id },
    select: { date: true, objetivoBNCCCode: true },
  });
  const existingKeys = new Set(
    existingDates.map(e => {
      const d = new Date(e.date);
      return `${d.toISOString().slice(0, 10)}_${e.objetivoBNCCCode}`;
    })
  );

  // Construir entries a inserir
  const toInsert = [];
  for (const seq of sequence) {
    const key = `${seq.date}_${seq.code}`;
    if (existingKeys.has(key)) continue;
    const entry = buildEntry(seq, matrix.id);
    if (entry) toInsert.push(entry);
  }

  console.log(`  Inserindo ${toInsert.length} novas entries...`);

  if (!DRY_RUN && toInsert.length > 0) {
    const result = await prisma.curriculumMatrixEntry.createMany({
      data: toInsert,
      skipDuplicates: true,
    });
    console.log(`  ✅ ${result.count} entries inseridas.`);
  } else if (DRY_RUN) {
    console.log(`  [DRY-RUN] ${toInsert.length} entries seriam inseridas.`);
    toInsert.slice(0, 3).forEach(e =>
      console.log(`    ${e.date.toISOString().slice(0,10)} — ${e.objetivoBNCCCode} — ${e.campoDeExperiencia}`)
    );
  }
}

async function main() {
  console.log(`seed-curriculum-by-segment.js`);
  console.log(`Segmento alvo: ${TARGET_SEGMENT} | DRY_RUN: ${DRY_RUN}\n`);

  // Encontrar mantenedora
  let mantenedoraId = process.env.MANTENEDORA_ID;
  if (!mantenedoraId) {
    const m = (await prisma.mantenedora.findFirst({
      where: { name: { contains: 'Coração', mode: 'insensitive' } },
    })) || (await prisma.mantenedora.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } }));
    if (!m) { console.error('❌ Mantenedora não encontrada'); process.exit(1); }
    mantenedoraId = m.id;
    console.log(`Mantenedora: ${m.name} (${mantenedoraId})\n`);
  }

  const segments = TARGET_SEGMENT === 'ALL' ? ['EI02', 'EI03'] : [TARGET_SEGMENT];
  const sequences = { EI02: SEQUENCE_EI02, EI03: SEQUENCE_EI03 };

  for (const seg of segments) {
    if (!sequences[seg]) {
      console.warn(`Segmento ${seg} não tem sequência definida neste script. Use EI02 ou EI03.`);
      continue;
    }
    await seedSegment(seg, sequences[seg], mantenedoraId);
  }

  console.log('\n✅ Concluído!');
}

main()
  .catch(e => { console.error('❌ Erro:', e.message || e); process.exit(1); })
  .finally(() => prisma.$disconnect());
