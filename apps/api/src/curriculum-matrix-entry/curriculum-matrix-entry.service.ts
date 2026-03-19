import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatrixCacheInvalidationService } from '../cache/matrix-cache-invalidation.service';
import { AuditService } from '../common/services/audit.service';
import { CreateCurriculumMatrixEntryDto } from './dto/create-curriculum-matrix-entry.dto';
import { UpdateCurriculumMatrixEntryDto } from './dto/update-curriculum-matrix-entry.dto';
import { QueryCurriculumMatrixEntryDto } from './dto/query-curriculum-matrix-entry.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { maskMatrizEntriesForProfessor, maskMatrizEntryForProfessor } from '../common/helpers/masking.helper';
import { RoleLevel } from '@prisma/client';

@Injectable()
export class CurriculumMatrixEntryService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  
    private readonly matrixCacheInvalidation: MatrixCacheInvalidationService,
  
) {}


  /**
   * Seed das semanas 6–8 (16/03 a 03/04/2026) para EI01, EI02, EI03.
   * Executa upsert idempotente — seguro para rodar múltiplas vezes.
   * Acesso restrito a DEVELOPER.
   */
  async seedW6W8(user: JwtPayload): Promise<{ inserted: number; updated: number; maxDate: string }> {
    if (user.roles[0]?.level !== 'DEVELOPER') {
      throw new ForbiddenException('Apenas DEVELOPER pode executar o seed');
    }

    // Resolver mantenedoraId
    let mantenedoraId = user.mantenedoraId;
    if (!mantenedoraId) {
      const m = await this.prisma.mantenedora.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
      if (!m) throw new BadRequestException('Nenhuma mantenedora ativa encontrada');
      mantenedoraId = m.id;
    }

    const ENTRIES: Array<{
      segment: 'EI01' | 'EI02' | 'EI03';
      date: string; weekOfYear: number; dayOfWeek: number; bimester: number;
      campoDeExperiencia: string; objetivoBNCCCode: string; objetivoBNCC: string;
      objetivoCurriculo: string; intencionalidade: string;
    }> = [
      // ── EI01 (Berçário) ──────────────────────────────────────────────────────
      { segment:'EI01', date:'2026-03-16', weekOfYear:11, dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS', objetivoBNCCCode:'EI01EO03', objetivoBNCC:'Interagir com crianças da mesma faixa etária e adultos, adaptando-se ao convívio social.', objetivoCurriculo:'Interagir com crianças da mesma faixa etária e adultos.', intencionalidade:'Favorecer a socialização e o desenvolvimento de vínculos afetivos seguros no ambiente escolar.' },
      { segment:'EI01', date:'2026-03-17', weekOfYear:11, dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS', objetivoBNCCCode:'EI01CG01', objetivoBNCC:'Movimentar as partes do corpo para exprimir corporalmente emoções, necessidades e desejos.', objetivoCurriculo:'Movimentar as partes do corpo para expressar emoções e necessidades.', intencionalidade:'Estimular a expressão corporal e a consciência do próprio corpo em situações cotidianas.' },
      { segment:'EI01', date:'2026-03-18', weekOfYear:11, dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS', objetivoBNCCCode:'EI01TS02', objetivoBNCC:'Traçar marcas gráficas, usando diferentes materiais em suportes como chão, papel e outros.', objetivoCurriculo:'Traçar marcas gráficas usando diferentes materiais e suportes.', intencionalidade:'Desenvolver a expressão gráfica e a experimentação sensorial com materiais variados.' },
      { segment:'EI01', date:'2026-03-19', weekOfYear:11, dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', objetivoBNCCCode:'EI01EF02', objetivoBNCC:'Demonstrar interesse ao ouvir a leitura de poemas e a apresentação de músicas.', objetivoCurriculo:'Demonstrar interesse ao ouvir leitura de poemas e músicas.', intencionalidade:'Ampliar o repertório cultural e o interesse pela linguagem oral e literária.' },
      { segment:'EI01', date:'2026-03-20', weekOfYear:11, dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', objetivoBNCCCode:'EI01ET02', objetivoBNCC:'Explorar relações de causa e efeito na interação com o ambiente natural e social.', objetivoCurriculo:'Explorar relações de causa e efeito no ambiente.', intencionalidade:'Estimular a curiosidade científica e o raciocínio causal por meio de atividades exploratórias.' },
      { segment:'EI01', date:'2026-03-23', weekOfYear:12, dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS', objetivoBNCCCode:'EI01EO01', objetivoBNCC:'Perceber que suas ações têm efeitos nas outras crianças e no ambiente.', objetivoCurriculo:'Perceber que suas ações têm efeitos nas outras crianças e no ambiente.', intencionalidade:'Desenvolver a consciência social e a responsabilidade pelas próprias ações.' },
      { segment:'EI01', date:'2026-03-24', weekOfYear:12, dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS', objetivoBNCCCode:'EI01CG03', objetivoBNCC:'Imitar gestos e movimentos de outras crianças, adultos e animais.', objetivoCurriculo:'Imitar gestos e movimentos de outras crianças, adultos e animais.', intencionalidade:'Ampliar o repertório motor e a capacidade de observação e imitação.' },
      { segment:'EI01', date:'2026-03-25', weekOfYear:12, dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS', objetivoBNCCCode:'EI01TS01', objetivoBNCC:'Explorar sons produzidos com o próprio corpo e com objetos do ambiente.', objetivoCurriculo:'Explorar sons produzidos com o próprio corpo e objetos.', intencionalidade:'Desenvolver a percepção sonora e a expressão musical por meio da exploração lúdica.' },
      { segment:'EI01', date:'2026-03-26', weekOfYear:12, dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', objetivoBNCCCode:'EI01EF01', objetivoBNCC:'Reconhecer quando é chamado por seu nome e reconhecer os nomes das pessoas com quem convive.', objetivoCurriculo:'Reconhecer o próprio nome e os nomes das pessoas com quem convive.', intencionalidade:'Fortalecer a identidade e o senso de pertencimento ao grupo social.' },
      { segment:'EI01', date:'2026-03-27', weekOfYear:12, dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', objetivoBNCCCode:'EI01ET01', objetivoBNCC:'Explorar e descobrir as propriedades de objetos e materiais (odor, cor, sabor, temperatura).', objetivoCurriculo:'Explorar e descobrir propriedades de objetos e materiais.', intencionalidade:'Estimular a curiosidade sensorial e o pensamento científico por meio da exploração de materiais.' },
      { segment:'EI01', date:'2026-03-30', weekOfYear:13, dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS', objetivoBNCCCode:'EI01EO02', objetivoBNCC:'Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos.', objetivoCurriculo:'Demonstrar atitudes de cuidado e solidariedade.', intencionalidade:'Cultivar valores de empatia e solidariedade nas relações cotidianas.' },
      { segment:'EI01', date:'2026-03-31', weekOfYear:13, dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS', objetivoBNCCCode:'EI01CG02', objetivoBNCC:'Explorar formas de deslocamento no espaço combinando movimentos e seguindo orientações.', objetivoCurriculo:'Explorar formas de deslocamento no espaço.', intencionalidade:'Desenvolver a coordenação motora grossa e a orientação espacial por meio de brincadeiras.' },
      { segment:'EI01', date:'2026-04-01', weekOfYear:13, dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS', objetivoBNCCCode:'EI01TS03', objetivoBNCC:'Explorar diferentes fontes sonoras e materiais para produzir sons.', objetivoCurriculo:'Explorar diferentes fontes sonoras.', intencionalidade:'Ampliar a percepção auditiva e a expressão musical por meio da exploração de materiais sonoros.' },
      { segment:'EI01', date:'2026-04-02', weekOfYear:13, dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', objetivoBNCCCode:'EI01EF03', objetivoBNCC:'Demonstrar interesse e atenção ao ouvir a leitura de histórias e outros textos.', objetivoCurriculo:'Demonstrar interesse ao ouvir histórias.', intencionalidade:'Desenvolver o gosto pela leitura e a capacidade de atenção e escuta.' },
      { segment:'EI01', date:'2026-04-03', weekOfYear:13, dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', objetivoBNCCCode:'EI01ET03', objetivoBNCC:'Manipular materiais diversos e variados explorando suas características físicas.', objetivoCurriculo:'Manipular materiais diversos explorando suas características.', intencionalidade:'Estimular a exploração sensorial e o desenvolvimento cognitivo por meio da manipulação de materiais.' },
      // ── EI02 (Maternal) ──────────────────────────────────────────────────────
      { segment:'EI02', date:'2026-03-16', weekOfYear:11, dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS', objetivoBNCCCode:'EI02EO05', objetivoBNCC:'Perceber que as pessoas têm características físicas diferentes, respeitando essas diferenças.', objetivoCurriculo:'Perceber e respeitar as diferenças físicas das pessoas.', intencionalidade:'Desenvolver o respeito à diversidade e a valorização das diferenças individuais.' },
      { segment:'EI02', date:'2026-03-17', weekOfYear:11, dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS', objetivoBNCCCode:'EI02CG02', objetivoBNCC:'Deslocar seu corpo no espaço, orientando-se por noções como em frente, atrás, no alto, embaixo.', objetivoCurriculo:'Deslocar-se no espaço orientando-se por noções espaciais.', intencionalidade:'Desenvolver a orientação espacial e a coordenação motora por meio de atividades lúdicas.' },
      { segment:'EI02', date:'2026-03-18', weekOfYear:11, dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS', objetivoBNCCCode:'EI02TS03', objetivoBNCC:'Utilizar diferentes fontes sonoras disponíveis no ambiente em brincadeiras cantadas.', objetivoCurriculo:'Utilizar fontes sonoras em brincadeiras cantadas.', intencionalidade:'Ampliar o repertório musical e a expressão criativa por meio de brincadeiras sonoras.' },
      { segment:'EI02', date:'2026-03-19', weekOfYear:11, dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', objetivoBNCCCode:'EI02EF06', objetivoBNCC:'Criar e contar histórias oralmente, com base em imagens ou temas sugeridos.', objetivoCurriculo:'Criar e contar histórias oralmente.', intencionalidade:'Desenvolver a imaginação, a narrativa oral e a criatividade por meio da contação de histórias.' },
      { segment:'EI02', date:'2026-03-20', weekOfYear:11, dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', objetivoBNCCCode:'EI02ET01', objetivoBNCC:'Explorar e descrever semelhanças e diferenças entre as características e propriedades dos objetos.', objetivoCurriculo:'Explorar e descrever semelhanças e diferenças dos objetos.', intencionalidade:'Desenvolver o pensamento classificatório e a capacidade de observação.' },
      { segment:'EI02', date:'2026-03-23', weekOfYear:12, dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS', objetivoBNCCCode:'EI02EO01', objetivoBNCC:'Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos.', objetivoCurriculo:'Demonstrar cuidado e solidariedade.', intencionalidade:'Fortalecer vínculos afetivos e desenvolver empatia nas relações cotidianas.' },
      { segment:'EI02', date:'2026-03-24', weekOfYear:12, dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS', objetivoBNCCCode:'EI02CG04', objetivoBNCC:'Demonstrar progressiva independência no cuidado do seu corpo.', objetivoCurriculo:'Demonstrar independência no cuidado do próprio corpo.', intencionalidade:'Desenvolver a autonomia e os hábitos de higiene e autocuidado.' },
      { segment:'EI02', date:'2026-03-25', weekOfYear:12, dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS', objetivoBNCCCode:'EI02TS01', objetivoBNCC:'Criar sons com materiais, objetos e instrumentos musicais, para acompanhar diversos ritmos.', objetivoCurriculo:'Criar sons com materiais e instrumentos musicais.', intencionalidade:'Ampliar o repertório musical e a expressão rítmica por meio da experimentação sonora.' },
      { segment:'EI02', date:'2026-03-26', weekOfYear:12, dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', objetivoBNCCCode:'EI02EF05', objetivoBNCC:'Relatar experiências e fatos acontecidos, histórias ouvidas, filmes ou peças teatrais assistidos.', objetivoCurriculo:'Relatar experiências vividas e histórias ouvidas.', intencionalidade:'Desenvolver a memória, a narrativa oral e a capacidade de comunicação.' },
      { segment:'EI02', date:'2026-03-27', weekOfYear:12, dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', objetivoBNCCCode:'EI02ET03', objetivoBNCC:'Compartilhar, com outras crianças, situações de cuidado de plantas e animais nos espaços da instituição.', objetivoCurriculo:'Cuidar de plantas e animais nos espaços da instituição.', intencionalidade:'Desenvolver a responsabilidade ambiental e o cuidado com os seres vivos.' },
      { segment:'EI02', date:'2026-03-30', weekOfYear:13, dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS', objetivoBNCCCode:'EI02EO04', objetivoBNCC:'Comunicar suas dissonâncias e mal-estares em relação às outras crianças e adultos.', objetivoCurriculo:'Comunicar desconfortos e mal-estares.', intencionalidade:'Fortalecer a expressão emocional e a capacidade de comunicar sentimentos negativos de forma saudável.' },
      { segment:'EI02', date:'2026-03-31', weekOfYear:13, dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS', objetivoBNCCCode:'EI02CG01', objetivoBNCC:'Apropriar-se de gestos e movimentos de sua cultura no cuidado de si.', objetivoCurriculo:'Apropriar-se de gestos e movimentos culturais no cuidado de si.', intencionalidade:'Valorizar a cultura corporal e os gestos de autocuidado no contexto cultural.' },
      { segment:'EI02', date:'2026-04-01', weekOfYear:13, dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS', objetivoBNCCCode:'EI02TS02', objetivoBNCC:'Utilizar materiais variados com possibilidades de manipulação, explorando cores e texturas.', objetivoCurriculo:'Utilizar materiais variados explorando cores e texturas.', intencionalidade:'Ampliar a expressão plástica e a criatividade por meio da exploração sensorial.' },
      { segment:'EI02', date:'2026-04-02', weekOfYear:13, dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', objetivoBNCCCode:'EI02EF03', objetivoBNCC:'Imitar e criar melodias e canções para expressar sentimentos e pensamentos.', objetivoCurriculo:'Imitar e criar melodias para expressar sentimentos.', intencionalidade:'Desenvolver a expressão musical e emocional por meio da criação de canções.' },
      { segment:'EI02', date:'2026-04-03', weekOfYear:13, dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', objetivoBNCCCode:'EI02ET04', objetivoBNCC:'Identificar relações espaciais (dentro e fora, em cima, embaixo, acima, abaixo, entre e do lado) e temporais (antes, durante e depois).', objetivoCurriculo:'Identificar relações espaciais e temporais.', intencionalidade:'Desenvolver a orientação espacial e temporal por meio de atividades cotidianas.' },
      // ── EI03 (Pré-escola) ────────────────────────────────────────────────────
      { segment:'EI03', date:'2026-03-16', weekOfYear:11, dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS', objetivoBNCCCode:'EI03EO06', objetivoBNCC:'Manifestar interesse e respeito por diferentes culturas e modos de vida.', objetivoCurriculo:'Manifestar interesse e respeito por diferentes culturas.', intencionalidade:'Desenvolver a consciência cultural e o respeito à diversidade por meio de atividades significativas.' },
      { segment:'EI03', date:'2026-03-17', weekOfYear:11, dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS', objetivoBNCCCode:'EI03CG04', objetivoBNCC:'Adotar hábitos de autocuidado relacionados à higiene, alimentação, conforto e aparência.', objetivoCurriculo:'Adotar hábitos de autocuidado e higiene.', intencionalidade:'Desenvolver a autonomia e a responsabilidade pelo próprio corpo e bem-estar.' },
      { segment:'EI03', date:'2026-03-18', weekOfYear:11, dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS', objetivoBNCCCode:'EI03TS02', objetivoBNCC:'Expressar-se livremente por meio de desenho, pintura, colagem, dobradura e escultura.', objetivoCurriculo:'Expressar-se livremente por meio de artes visuais.', intencionalidade:'Ampliar a expressão artística e a criatividade por meio de diferentes linguagens visuais.' },
      { segment:'EI03', date:'2026-03-19', weekOfYear:11, dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', objetivoBNCCCode:'EI03EF09', objetivoBNCC:'Levantar hipóteses em relação à linguagem escrita, realizando registros de palavras e textos.', objetivoCurriculo:'Levantar hipóteses sobre a linguagem escrita.', intencionalidade:'Desenvolver a consciência fonológica e a compreensão da função social da escrita.' },
      { segment:'EI03', date:'2026-03-20', weekOfYear:11, dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', objetivoBNCCCode:'EI03ET06', objetivoBNCC:'Relatar fatos importantes sobre seu nascimento e desenvolvimento, a história dos seus familiares e da sua comunidade.', objetivoCurriculo:'Relatar fatos sobre sua história e da comunidade.', intencionalidade:'Desenvolver a identidade pessoal e o senso de pertencimento histórico e cultural.' },
      { segment:'EI03', date:'2026-03-23', weekOfYear:12, dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS', objetivoBNCCCode:'EI03EO01', objetivoBNCC:'Demonstrar empatia pelos outros, percebendo que as pessoas têm diferentes sentimentos, necessidades e maneiras de pensar e agir.', objetivoCurriculo:'Demonstrar empatia percebendo diferentes sentimentos e necessidades.', intencionalidade:'Fortalecer a inteligência emocional e a capacidade de compreender o outro.' },
      { segment:'EI03', date:'2026-03-24', weekOfYear:12, dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS', objetivoBNCCCode:'EI03CG01', objetivoBNCC:'Criar com o corpo formas diversificadas de expressão de sentimentos, sensações e emoções.', objetivoCurriculo:'Criar formas de expressão corporal de sentimentos e emoções.', intencionalidade:'Ampliar o repertório expressivo corporal e a consciência emocional.' },
      { segment:'EI03', date:'2026-03-25', weekOfYear:12, dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS', objetivoBNCCCode:'EI03TS01', objetivoBNCC:'Utilizar sons produzidos por materiais, objetos e instrumentos musicais durante brincadeiras de faz de conta.', objetivoCurriculo:'Utilizar sons em brincadeiras de faz de conta.', intencionalidade:'Desenvolver a expressão musical e a imaginação por meio de brincadeiras simbólicas.' },
      { segment:'EI03', date:'2026-03-26', weekOfYear:12, dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', objetivoBNCCCode:'EI03EF01', objetivoBNCC:'Expressar ideias, desejos e sentimentos sobre suas vivências, por meio da linguagem oral e escrita.', objetivoCurriculo:'Expressar ideias e sentimentos por meio da linguagem oral e escrita.', intencionalidade:'Desenvolver a comunicação oral e escrita como instrumento de expressão e interação social.' },
      { segment:'EI03', date:'2026-03-27', weekOfYear:12, dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', objetivoBNCCCode:'EI03ET03', objetivoBNCC:'Identificar e selecionar fontes de informações, para responder a questões sobre a natureza, seus fenômenos, sua conservação.', objetivoCurriculo:'Identificar fontes de informação sobre a natureza.', intencionalidade:'Desenvolver o pensamento científico e a capacidade de investigação.' },
      { segment:'EI03', date:'2026-03-30', weekOfYear:13, dayOfWeek:1, bimester:1, campoDeExperiencia:'O_EU_O_OUTRO_E_O_NOS', objetivoBNCCCode:'EI03EO03', objetivoBNCC:'Ampliar as relações interpessoais, desenvolvendo atitudes de participação e cooperação.', objetivoCurriculo:'Ampliar relações interpessoais com participação e cooperação.', intencionalidade:'Fortalecer a cooperação, a participação coletiva e o trabalho em grupo.' },
      { segment:'EI03', date:'2026-03-31', weekOfYear:13, dayOfWeek:2, bimester:1, campoDeExperiencia:'CORPO_GESTOS_E_MOVIMENTOS', objetivoBNCCCode:'EI03CG02', objetivoBNCC:'Demonstrar controle e adequação do uso de seu corpo em brincadeiras e jogos, escuta e reconto de histórias.', objetivoCurriculo:'Demonstrar controle corporal em brincadeiras e jogos.', intencionalidade:'Desenvolver a autorregulação corporal e a consciência das regras sociais.' },
      { segment:'EI03', date:'2026-04-01', weekOfYear:13, dayOfWeek:3, bimester:1, campoDeExperiencia:'TRACOS_SONS_CORES_E_FORMAS', objetivoBNCCCode:'EI03TS03', objetivoBNCC:'Reconhecer as qualidades do som (intensidade, duração, altura e timbre), utilizando-as em suas produções sonoras.', objetivoCurriculo:'Reconhecer qualidades do som em produções sonoras.', intencionalidade:'Desenvolver a percepção musical e a expressão sonora com vocabulário específico.' },
      { segment:'EI03', date:'2026-04-02', weekOfYear:13, dayOfWeek:4, bimester:1, campoDeExperiencia:'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', objetivoBNCCCode:'EI03EF04', objetivoBNCC:'Recontar histórias ouvidas e planejar coletivamente roteiros de vídeos e de encenações.', objetivoCurriculo:'Recontar histórias e planejar encenações coletivas.', intencionalidade:'Desenvolver a memória narrativa, a cooperação e a expressão dramática.' },
      { segment:'EI03', date:'2026-04-03', weekOfYear:13, dayOfWeek:5, bimester:1, campoDeExperiencia:'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', objetivoBNCCCode:'EI03ET05', objetivoBNCC:'Classificar objetos e figuras de acordo com suas semelhanças e diferenças.', objetivoCurriculo:'Classificar objetos e figuras por semelhanças e diferenças.', intencionalidade:'Desenvolver o pensamento lógico-matemático e a capacidade de classificação.' },
    ];

    const segmentNames: Record<string, string> = {
      EI01: 'Berçário — Matriz Curricular 2026',
      EI02: 'Maternal — Matriz Curricular 2026',
      EI03: 'Pré-escola — Matriz Curricular 2026',
    };

    let inserted = 0;
    let updated = 0;

    for (const seg of ['EI01', 'EI02', 'EI03'] as const) {
      // Resolver ou criar a CurriculumMatrix
      let matrix = await this.prisma.curriculumMatrix.findFirst({
        where: { mantenedoraId, year: 2026, segment: seg, isActive: true },
      });
      if (!matrix) {
        const inactive = await this.prisma.curriculumMatrix.findFirst({
          where: { mantenedoraId, year: 2026, segment: seg },
        });
        if (inactive) {
          matrix = await this.prisma.curriculumMatrix.update({
            where: { id: inactive.id },
            data: { isActive: true, name: segmentNames[seg] },
          });
        } else {
          matrix = await this.prisma.curriculumMatrix.create({
            data: { mantenedoraId, name: segmentNames[seg], year: 2026, segment: seg, version: 1, isActive: true },
          });
        }
      }

      const entries = ENTRIES.filter(e => e.segment === seg);
      for (const entry of entries) {
        const date = new Date(entry.date + 'T12:00:00.000Z');
        const result = await this.prisma.curriculumMatrixEntry.upsert({
          where: { matrixId_date: { matrixId: matrix.id, date } },
          update: {
            weekOfYear: entry.weekOfYear, dayOfWeek: entry.dayOfWeek, bimester: entry.bimester,
            campoDeExperiencia: entry.campoDeExperiencia as any,
            objetivoBNCC: entry.objetivoBNCC, objetivoBNCCCode: entry.objetivoBNCCCode,
            objetivoCurriculo: entry.objetivoCurriculo, intencionalidade: entry.intencionalidade,
          },
          create: {
            matrixId: matrix.id, date,
            weekOfYear: entry.weekOfYear, dayOfWeek: entry.dayOfWeek, bimester: entry.bimester,
            campoDeExperiencia: entry.campoDeExperiencia as any,
            objetivoBNCC: entry.objetivoBNCC, objetivoBNCCCode: entry.objetivoBNCCCode,
            objetivoCurriculo: entry.objetivoCurriculo, intencionalidade: entry.intencionalidade,
          },
        });
        const diff = Math.abs(result.updatedAt.getTime() - result.createdAt.getTime());
        if (diff < 1000) inserted++; else updated++;
      }
    }

    await this.matrixCacheInvalidation.bump(mantenedoraId);

    // Verificar max(date) no banco
    const latest = await this.prisma.curriculumMatrixEntry.findFirst({
      where: { matrix: { mantenedoraId, isActive: true } },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    return {
      inserted,
      updated,
      maxDate: latest?.date?.toISOString().split('T')[0] ?? 'unknown',
    };
  }

  /**
   * Criar uma nova entrada na Matriz Curricular
   * Apenas Mantenedora e Staff Central podem criar
   */
  async create(createDto: CreateCurriculumMatrixEntryDto, user: JwtPayload) {
    // Validar permissão
    if (
      user.roles[0]?.level !== 'DEVELOPER' &&
      user.roles[0]?.level !== 'MANTENEDORA' &&
      user.roles[0]?.level !== 'STAFF_CENTRAL'
    ) {
      throw new ForbiddenException(
        'Apenas Mantenedora e Staff Central podem criar entradas na matriz',
      );
    }

    // Verificar se a matriz existe e pertence à mantenedora
    const matrix = await this.prisma.curriculumMatrix.findUnique({
      where: { id: createDto.matrixId },
    });

    if (!matrix) {
      throw new NotFoundException('Matriz curricular não encontrada');
    }

    if (matrix.mantenedoraId !== user.mantenedoraId && user.roles[0]?.level !== 'DEVELOPER') {
      throw new ForbiddenException('Acesso negado a esta matriz');
    }

    // FIX C3.4: padronizar data com offset -03:00 para alinhar com o parser PDF
    // Evita drift: parser grava T03:00Z, create manual gravava T00:00Z
    // Ambos representam meia-noite BRT, mas o unique constraint os trata como datas diferentes
    const normalizedDate = new Date(createDto.date + 'T00:00:00-03:00');
    // Verificar se já existe uma entrada para a mesma data e campo de experiência
    // Usar intervalo UTC do dia para busca robusta
    const dateParts = createDto.date.split('-').map(Number);
    const existingStart = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0));
    const existingEnd   = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59, 999));
    const existing = await this.prisma.curriculumMatrixEntry.findFirst({
      where: {
        matrixId: createDto.matrixId,
        date: { gte: existingStart, lte: existingEnd },
        campoDeExperiencia: createDto.campoDeExperiencia,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Já existe uma entrada para ${createDto.campoDeExperiencia} na data ${createDto.date}`,
      );
    }

    // Criar entrada
    const entry = await this.prisma.curriculumMatrixEntry.create({
      data: {
        ...createDto,
        date: normalizedDate,
      },
      include: {
        matrix: true,
      },
    });

    // Auditoria
    await this.auditService.log({
      action: 'CREATE',
      entity: 'CURRICULUM_MATRIX_ENTRY',
      entityId: entry.id,
      userId: user.sub,
      mantenedoraId: user.mantenedoraId,
      changes: {
        matrixId: entry.matrixId,
        date: entry.date,
        campoDeExperiencia: entry.campoDeExperiencia,
      },
    });

    await this.matrixCacheInvalidation.bump(user.mantenedoraId);

    return entry;
  }

  /**
   * Listar entradas com filtros
   */
  async findAll(query: QueryCurriculumMatrixEntryDto, user: JwtPayload) {
    // Validar acesso
    await this.validateAccess(user);

    const where: any = {};

    if (query.matrixId) {
      // Verificar se a matriz pertence à mantenedora
      const matrix = await this.prisma.curriculumMatrix.findUnique({
        where: { id: query.matrixId },
      });

      if (!matrix) {
        throw new NotFoundException('Matriz curricular não encontrada');
      }

      if (matrix.mantenedoraId !== user.mantenedoraId && user.roles[0]?.level !== 'DEVELOPER') {
        throw new ForbiddenException('Acesso negado a esta matriz');
      }

      where.matrixId = query.matrixId;
    } else {
      // Filtrar por mantenedora se não especificar matriz
      where.matrix = {
        mantenedoraId: user.mantenedoraId,
      };
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    if (query.weekOfYear) {
      where.weekOfYear = query.weekOfYear;
    }

    if (query.dayOfWeek) {
      where.dayOfWeek = query.dayOfWeek;
    }

    if (query.campoDeExperiencia) {
      where.campoDeExperiencia = query.campoDeExperiencia;
    }

    const entries = await this.prisma.curriculumMatrixEntry.findMany({
      where,
      include: {
        matrix: {
          select: {
            id: true,
            name: true,
            year: true,
            segment: true,
          },
        },
        _count: {
          select: { diaryEvents: true },
        },
      },
      orderBy: [{ date: 'asc' }, { campoDeExperiencia: 'asc' }],
    });

    return maskMatrizEntriesForProfessor(user, entries);
  }

  /**
   * Buscar entrada por ID
   */
  async findOne(id: string, user: JwtPayload) {
    await this.validateAccess(user);

    const entry = await this.prisma.curriculumMatrixEntry.findFirst({
      where: {
        id,
        matrix: {
          mantenedoraId: user.roles[0]?.level === 'DEVELOPER' ? undefined : user.mantenedoraId,
        },
      },
      include: {
        matrix: true,
        diaryEvents: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            child: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Entrada da matriz não encontrada');
    }

    return maskMatrizEntryForProfessor(user, entry);
  }

  /**
   * Atualizar entrada (apenas campos editáveis)
   */
  async update(id: string, updateDto: UpdateCurriculumMatrixEntryDto, user: JwtPayload) {
    // Validar permissão
    if (
      user.roles[0]?.level !== 'DEVELOPER' &&
      user.roles[0]?.level !== 'MANTENEDORA' &&
      user.roles[0]?.level !== 'STAFF_CENTRAL'
    ) {
      throw new ForbiddenException(
        'Apenas Mantenedora e Staff Central podem atualizar entradas',
      );
    }

    const entry = await this.findOne(id, user);

    // Verificar se há eventos vinculados
    const eventsCount = await this.prisma.diaryEvent.count({
      where: { curriculumEntryId: id },
    });

    if (eventsCount > 0) {
      // Permitir apenas atualização de campos não-normativos
      if (Object.keys(updateDto).some(key => !['intencionalidade', 'exemploAtividade', 'weekOfYear', 'dayOfWeek', 'bimester', 'objetivoBNCCCode'].includes(key))) {
        throw new BadRequestException(
          `Esta entrada possui ${eventsCount} evento(s) vinculado(s). Apenas campos de sugestão podem ser editados.`,
        );
      }
    }

    const updated = await this.prisma.curriculumMatrixEntry.update({
      where: { id },
      data: updateDto,
      include: {
        matrix: true,
      },
    });

    // Auditoria
    await this.auditService.log({
      action: 'UPDATE',
      entity: 'CURRICULUM_MATRIX_ENTRY',
      entityId: id,
      userId: user.sub,
      mantenedoraId: user.mantenedoraId,
      changes: { before: entry, after: updated },
    });

    await this.matrixCacheInvalidation.bump(user.mantenedoraId);

    return updated;
  }

  /**
   * Deletar entrada
   */
  async remove(id: string, user: JwtPayload) {
    // Validar permissão
    if (user.roles[0]?.level !== 'DEVELOPER' && user.roles[0]?.level !== 'MANTENEDORA') {
      throw new ForbiddenException('Apenas Mantenedora pode deletar entradas');
    }

    const entry = await this.findOne(id, user);

    // Verificar se há eventos vinculados
    const eventsCount = await this.prisma.diaryEvent.count({
      where: { curriculumEntryId: id },
    });

    if (eventsCount > 0) {
      throw new BadRequestException(
        `Não é possível deletar uma entrada com ${eventsCount} evento(s) vinculado(s)`,
      );
    }

    await this.prisma.curriculumMatrixEntry.delete({
      where: { id },
    });

    // Auditoria
    await this.auditService.log({
      action: 'DELETE',
      entity: 'CURRICULUM_MATRIX_ENTRY',
      entityId: id,
      userId: user.sub,
      mantenedoraId: user.mantenedoraId,
      changes: { entry },
    });

    await this.matrixCacheInvalidation.bump(user.mantenedoraId);

    return { message: 'Entrada da matriz deletada com sucesso' };
  }

  /**
   * Validar acesso do usuário
   */
  private async validateAccess(user: JwtPayload) {
    if (user.roles[0]?.level === 'DEVELOPER') {
      return; // Developer tem acesso total
    }

    // Todos os outros níveis podem visualizar, mas apenas criar/editar é restrito
    return;
  }

  /**
   * Busca as entradas da Matriz para uma turma + data específica.
   * Detecta o segmento via ageGroupMin do Classroom (sem fallback).
   * Retorna os 4 campos obrigatórios + exemploAtividade condicionalmente por role:
   * - PROFESSOR: sem exemploAtividade
   * - UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER: com exemploAtividade
   * Contrato de retorno padronizado conforme spec.
   */
  async byClassroomDay(
    classroomId: string,
    date: string,
    user: JwtPayload,
  ): Promise<{
    segment: string | null;
    date: string;
    classroomId: string;
    objectives: Array<{
      campoExperiencia: string;
      codigoBNCC: string | null;
      objetivoBNCC: string;
      objetivoCurriculoDF: string;
      intencionalidadePedagogica: string | null;
      exemploAtividade?: string | null;
    }>;
    message?: string;
  }> {
    // 1. Buscar a turma e validar acesso multi-tenant
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        ageGroupMin: true,
        ageGroupMax: true,
        unit: {
          select: {
            id: true,
            mantenedoraId: true,
          },
        },
      },
    });

    if (!classroom) {
      return { segment: null, date, classroomId, objectives: [], message: 'Turma não encontrada' };
    }

    // Validar escopo: o usuário deve pertencer à mesma mantenedora
    const level = user.roles[0]?.level;
    if (level !== 'DEVELOPER' && classroom.unit.mantenedoraId !== user.mantenedoraId) {
      return { segment: null, date, classroomId, objectives: [], message: 'Acesso negado a esta turma' };
    }

    // 2. Detectar segmento via ageGroupMin (meses) — sem fallback
    // EI01: 0–18 meses | EI02: 19–47 meses | EI03: 48–71 meses
    const min = classroom.ageGroupMin ?? 0;
    let segment: string | null = null;
    if (min <= 18) segment = 'EI01';
    else if (min <= 47) segment = 'EI02';
    else if (min <= 71) segment = 'EI03';

    if (!segment) {
      return {
        segment: null,
        date,
        classroomId,
        objectives: [],
        message: `Não foi possível detectar o segmento da turma (ageGroupMin=${min}). Verifique a configuração da turma.`,
      };
    }

    // 3. Normalizar a data usando Date.UTC para cobrir tanto T00:00Z quanto T03:00Z
    // (parser PDF grava com offset -03:00 = T03:00Z; frontend envia YYYY-MM-DD = T00:00Z)
    const parts = date.split('-').map(Number);
    const year = parts[0];
    const month = parts[1] - 1; // 0-indexed
    const day = parts[2];
    const targetDateStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const targetDateEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    // 4. Buscar a matriz ativa do segmento no escopo da mantenedora
    const matrix = await this.prisma.curriculumMatrix.findFirst({
      where: {
        mantenedoraId: classroom.unit.mantenedoraId,
        segment,
        isActive: true,
      },
      orderBy: { version: 'desc' },
      select: { id: true, name: true, segment: true },
    });

    if (!matrix) {
      return {
        segment,
        date,
        classroomId,
        objectives: [],
        message: `Nenhuma matriz ativa encontrada para o segmento ${segment} desta mantenedora.`,
      };
    }

    // Determinar se o usuário pode ver exemploAtividade
    // PROFESSOR não recebe; UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER recebem
    const isProfessorOnly = user.roles.every(
      (r) => r.level === RoleLevel.PROFESSOR,
    );

    // 5. Buscar as entries do dia
    const entries = await this.prisma.curriculumMatrixEntry.findMany({
      where: {
        matrixId: matrix.id,
        date: {
          gte: targetDateStart,
          lte: targetDateEnd,
        },
      },
      select: {
        campoDeExperiencia: true,
        objetivoBNCCCode: true,
        objetivoBNCC: true,
        objetivoCurriculo: true,
        intencionalidade: true,
        // exemploAtividade: retornado apenas para roles acima de PROFESSOR
        ...(isProfessorOnly ? {} : { exemploAtividade: true }),
      },
      orderBy: { campoDeExperiencia: 'asc' },
    });

    // 6. Mapear para o contrato padronizado
    const objectives = entries.map((e) => {
      const obj: {
        campoExperiencia: string;
        codigoBNCC: string | null;
        objetivoBNCC: string;
        objetivoCurriculoDF: string;
        intencionalidadePedagogica: string | null;
        exemploAtividade?: string | null;
      } = {
        campoExperiencia: e.campoDeExperiencia as string,
        codigoBNCC: e.objetivoBNCCCode ?? null,
        objetivoBNCC: e.objetivoBNCC,
        objetivoCurriculoDF: e.objetivoCurriculo,
        intencionalidadePedagogica: e.intencionalidade ?? null,
      };
      if (!isProfessorOnly && 'exemploAtividade' in e) {
        obj.exemploAtividade = (e as any).exemploAtividade ?? null;
      }
      return obj;
    });

    // FIX C2: quando não há entradas cadastradas para a data, retornar message explicativa
    // para que o frontend distinga "data sem registro" de "erro de sistema"
    if (objectives.length === 0) {
      return {
        segment,
        date,
        classroomId,
        objectives,
        message: `Nenhum objetivo cadastrado na Matriz 2026 para a data ${date}. Verifique se a entrada foi cadastrada para este segmento.`,
      };
    }

    return { segment, date, classroomId, objectives };
  }

  /**
   * Retorna a Matriz completa com exemploAtividade para coordenação.
   * Agrupa por data e retorna todos os campos incluindo exemploAtividade.
   */
  async getMatrizFullForCoord(
    segment: string,
    startDateStr: string,
    endDateStr: string,
    unitId: string,
    user: JwtPayload,
  ) {
    const mantenedoraId = user.mantenedoraId;
    if (!mantenedoraId) throw new ForbiddenException('Escopo de mantenedora ausente');

    const start = new Date(startDateStr + 'T00:00:00-03:00');
    const end = new Date(endDateStr + 'T23:59:59-03:00');

    // Buscar matriz ativa para o segmento (ou todas se segment não informado)
    const matrix = await this.prisma.curriculumMatrix.findFirst({
      where: {
        mantenedoraId,
        ...(segment ? { segment } : {}),
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!matrix) {
      return { segment: segment || 'todos', diasLetivos: [], aviso: 'Nenhuma matriz ativa encontrada para este segmento' };
    }

    const entries = await this.prisma.curriculumMatrixEntry.findMany({
      where: {
        matrixId: matrix.id,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    // Agrupar por data
    const byDate: Record<string, any[]> = {};
    for (const e of entries) {
      const key = e.date.toISOString().split('T')[0];
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push({
        id: e.id,
        campoExperiencia: (e as any).campoDeExperiencia ?? '',
        objetivoBNCCCodigo: (e as any).objetivoBNCCCode ?? '',
        objetivoBNCC: (e as any).objetivoBNCC ?? '',
        objetivoCurriculo: (e as any).objetivoCurriculo ?? '',
        intencionalidade: (e as any).intencionalidade ?? '',
        semana: (e as any).weekTheme ?? (e as any).semana ?? '',
        // Coordenação sempre vê o exemploAtividade:
        exemploAtividade: (e as any).exemploAtividade ?? '',
      });
    }

    return {
      segment: segment || matrix.segment,
      matrixId: matrix.id,
      startDate: startDateStr,
      endDate: endDateStr,
      totalEntradas: entries.length,
      diasLetivos: Object.entries(byDate).map(([date, objectives]) => ({
        date,
        diaSemana: new Date(date + 'T12:00:00-03:00').toLocaleDateString('pt-BR', {
          weekday: 'long', timeZone: 'America/Sao_Paulo',
        }),
        objectives,
      })),
    };
  }

  /**
   * Busca objetivos da Matriz para uma turma a partir de uma data, por N dias.
   * Retorna array de dias com objetivos, respeitando controle de exemploAtividade por role.
   */
  async byClassroomDateRange(
    classroomId: string,
    startDateStr: string,
    days: number,
    user: JwtPayload,
  ) {
    // Gerar array de datas
    const dates: string[] = [];
    const base = new Date(startDateStr + 'T12:00:00-03:00');
    for (let i = 0; i < days; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    // Buscar objetivos para cada dia em paralelo
    const results = await Promise.all(
      dates.map(async (date) => {
        const dayResult = await this.byClassroomDay(classroomId, date, user);
        return {
          date,
          diaSemana: new Date(date + 'T12:00:00-03:00').toLocaleDateString('pt-BR', {
            weekday: 'long', timeZone: 'America/Sao_Paulo',
          }),
          segment: dayResult.segment,
          objectives: dayResult.objectives,
          message: dayResult.message,
        };
      }),
    );

    return {
      classroomId,
      startDate: startDateStr,
      days,
      diasLetivos: results,
    };
  }
}
