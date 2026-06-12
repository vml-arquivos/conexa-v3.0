import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import OpenAI from "openai";
import {
  GeminiProviderError,
  GeminiService,
} from "../ai/services/gemini.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  FaixaEtaria,
  GerarAtividadeDto,
  TipoAtividade,
} from "./dto/gerar-atividade.dto";

export interface AtividadeGerada {
  titulo: string;
  descricao: string;
  intencionalidade: string;
  materiais: string[];
  etapas: string[];
  duracao: string;
  adaptacoes: string;
  registroSugerido: string;
  campoDeExperiencia: string;
  objetivoBNCC: string;
  objetivoCurriculo: string;
  faixaEtaria: string;
  geradoPorIA: true;
}

interface AtividadeGeradaPayload {
  titulo: string;
  descricao: string;
  intencionalidade: string;
  materiais: string[];
  etapas: string[];
  duracao: string;
  adaptacoes: string;
  registroSugerido: string;
}

export interface MicrogestosPayload {
  microgestos: string[];
  justificativa: string;
}

export interface RelatorioAlunoPayload {
  relatorio: string;
  pontosFortess: string[];
  sugestoes: string[];
}

const LABELS_FAIXA: Record<FaixaEtaria, string> = {
  [FaixaEtaria.EI01]: "Bebês (0 a 1 ano e 6 meses)",
  [FaixaEtaria.EI02]:
    "Crianças Bem Pequenas (1 ano e 7 meses a 3 anos e 11 meses)",
  [FaixaEtaria.EI03]: "Crianças Pequenas (4 anos a 5 anos e 11 meses)",
};

const LABELS_TIPO: Record<TipoAtividade, string> = {
  [TipoAtividade.RODA_DE_CONVERSA]: "Roda de Conversa",
  [TipoAtividade.EXPLORACAO_SENSORIAL]: "Exploração Sensorial",
  [TipoAtividade.ATIVIDADE_PLASTICA]: "Atividade Plástica",
  [TipoAtividade.BRINCADEIRA_DIRIGIDA]: "Brincadeira Dirigida",
  [TipoAtividade.LEITURA_COMPARTILHADA]: "Leitura Compartilhada",
  [TipoAtividade.MUSICA_E_MOVIMENTO]: "Música e Movimento",
  [TipoAtividade.JOGO_SIMBOLICO]: "Jogo Simbólico",
  [TipoAtividade.INVESTIGACAO]: "Investigação",
  [TipoAtividade.SEQUENCIA_DIDATICA]: "Sequência Didática",
  [TipoAtividade.LIVRE]: "Livre",
};

@Injectable()
export class IaAssistivaService {
  private readonly logger = new Logger(IaAssistivaService.name);
  private openAiFallback: OpenAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {
    if (this.geminiService.isEnabled()) {
      this.logger.log(
        `IA Assistiva: Gemini nativo habilitado. Modelo: ${this.geminiService.getConfiguredModel()}.`,
      );
    } else if (this.hasOpenAiFallback()) {
      this.logger.warn(
        "IA Assistiva: Gemini não configurado. Usando OPENAI_API_KEY como fallback.",
      );
    } else {
      this.logger.warn(
        "IA Assistiva: nenhuma chave configurada. Endpoints de IA retornarão erro controlado.",
      );
    }
  }

  private hasOpenAiFallback(): boolean {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }

  private getOpenAiFallback(): OpenAI {
    if (this.openAiFallback) return this.openAiFallback;

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "Nenhum provedor de IA está configurado. Configure GEMINI_API_KEY no container da API.",
      );
    }

    this.openAiFallback = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
      timeout: 45_000,
      maxRetries: 1,
    });

    return this.openAiFallback;
  }

  private getOpenAiModel(): string {
    return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  }

  private async generateJson<T>(params: {
    prompt: string;
    systemInstruction: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<T> {
    try {
      if (this.geminiService.isEnabled()) {
        return await this.geminiService.generateJSON<T>(
          params.prompt,
          params.systemInstruction,
        );
      }

      const client = this.getOpenAiFallback();
      const response = await client.chat.completions.create({
        model: this.getOpenAiModel(),
        messages: [
          { role: "system", content: params.systemInstruction },
          { role: "user", content: params.prompt },
        ],
        temperature: params.temperature ?? 0.3,
        max_tokens: params.maxTokens ?? 1500,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("O provedor de IA não retornou conteúdo.");
      }

      return JSON.parse(content) as T;
    } catch (error) {
      throw this.mapProviderError(error);
    }
  }

  private mapProviderError(error: unknown): ServiceUnavailableException {
    if (error instanceof ServiceUnavailableException) return error;

    if (error instanceof GeminiProviderError) {
      return new ServiceUnavailableException({
        statusCode: 503,
        error: "AI_PROVIDER_ERROR",
        code: error.code,
        provider: "GEMINI",
        model: this.geminiService.getConfiguredModel(),
        message: error.message,
      });
    }

    const raw = error as {
      message?: string;
      status?: number;
      statusCode?: number;
      code?: string;
      response?: { status?: number };
    };
    const detail = String(raw?.message ?? error ?? "Erro desconhecido");
    const normalized = detail.toLowerCase();
    const status = raw?.status ?? raw?.statusCode ?? raw?.response?.status;

    let code = "UNKNOWN";
    let message = "Serviço de IA temporariamente indisponível.";

    if (
      status === 401 ||
      status === 403 ||
      normalized.includes("api key") ||
      normalized.includes("unauthorized") ||
      normalized.includes("permission denied") ||
      normalized.includes("403 forbidden")
    ) {
      code = "AUTH";
      message = "A chave do provedor de IA foi recusada.";
    } else if (
      status === 404 ||
      normalized.includes("404 not found") ||
      normalized.includes("model")
    ) {
      code = "MODEL_NOT_FOUND";
      message = "O modelo configurado não foi encontrado ou não está liberado.";
    } else if (
      status === 429 ||
      normalized.includes("quota") ||
      normalized.includes("rate limit") ||
      normalized.includes("429 too many requests")
    ) {
      code = "RATE_LIMIT";
      message = "A cota ou o limite de requisições da IA foi atingido.";
    } else if (
      normalized.includes("timeout") ||
      normalized.includes("timed out")
    ) {
      code = "TIMEOUT";
      message = "A chamada ao provedor de IA excedeu o tempo limite.";
    } else if (
      normalized.includes("enotfound") ||
      normalized.includes("eai_again") ||
      normalized.includes("fetch failed") ||
      normalized.includes("network")
    ) {
      code = "NETWORK";
      message =
        "O servidor da API não conseguiu acessar o provedor de IA. Verifique DNS, firewall e saída HTTPS da VPS.";
    }

    this.logger.error(
      `Falha no provedor de IA: code=${code}; status=${status ?? "n/a"}; detail=${detail}`,
    );

    return new ServiceUnavailableException({
      statusCode: 503,
      error: "AI_PROVIDER_ERROR",
      code,
      provider: this.geminiService.isEnabled() ? "GEMINI" : "OPENAI",
      model: this.geminiService.isEnabled()
        ? this.geminiService.getConfiguredModel()
        : this.getOpenAiModel(),
      message,
    });
  }

  async status(): Promise<{
    configured: boolean;
    provider: "GEMINI" | "OPENAI" | "NONE";
    model: string | null;
    test: "OK";
    response: string;
  }> {
    if (this.geminiService.isEnabled()) {
      try {
        const result = await this.geminiService.healthCheck();
        return {
          configured: true,
          provider: "GEMINI",
          model: result.model,
          test: "OK",
          response: result.response,
        };
      } catch (error) {
        throw this.mapProviderError(error);
      }
    }

    if (this.hasOpenAiFallback()) {
      try {
        const result = await this.generateJson<{ status: string }>({
          prompt: 'Retorne {"status":"OK"}.',
          systemInstruction: "Responda somente com JSON válido.",
          temperature: 0,
          maxTokens: 20,
        });
        return {
          configured: true,
          provider: "OPENAI",
          model: this.getOpenAiModel(),
          test: "OK",
          response: result.status,
        };
      } catch (error) {
        throw this.mapProviderError(error);
      }
    }

    throw new ServiceUnavailableException({
      statusCode: 503,
      error: "AI_NOT_CONFIGURED",
      code: "NOT_CONFIGURED",
      provider: "NONE",
      model: null,
      message:
        "GEMINI_API_KEY não está configurada no container da API. Salve a variável no serviço da API e faça redeploy.",
    });
  }

  /**
   * Gera uma atividade pedagógica completa alinhada à Sequência Piloto 2026.
   * Os três dados curriculares recebidos permanecem imutáveis.
   */
  async gerarAtividade(dto: GerarAtividadeDto): Promise<AtividadeGerada> {
    const faixaLabel = LABELS_FAIXA[dto.faixaEtaria] || dto.faixaEtaria;
    const tipoLabel = dto.tipoAtividade
      ? LABELS_TIPO[dto.tipoAtividade]
      : "à sua escolha (sugira o mais adequado)";

    const prompt = `Você é uma especialista em Educação Infantil, com profundo conhecimento na BNCC e no Currículo em Movimento do Distrito Federal.

Sua tarefa é criar UMA atividade pedagógica completa e detalhada para professores de Educação Infantil.

## CONTEXTO FIXO (NÃO ALTERE ESTES DADOS — vêm da Sequência Piloto 2026)
- Campo de Experiência: ${dto.campoDeExperiencia}
- Objetivo BNCC: ${dto.objetivoBNCC}
- Objetivo do Currículo em Movimento DF: ${dto.objetivoCurriculo}

## DADOS DA TURMA
- Faixa Etária: ${faixaLabel}
- Tipo de Atividade: ${tipoLabel}
- Número de Crianças: ${dto.numeroCriancas ? `${dto.numeroCriancas} crianças` : "não informado"}
${dto.contextoAdicional ? `- Contexto Adicional: ${dto.contextoAdicional}` : ""}

## INSTRUÇÕES
1. Crie uma atividade criativa, lúdica e adequada à faixa etária.
2. Alinhe a atividade diretamente aos dados curriculares informados.
3. Use linguagem simples e executável pela professora.
4. Considere recursos básicos.
5. Inclua adaptações inclusivas.
6. Não altere, substitua ou reinterprete os dados curriculares fixos.

Retorne JSON com esta estrutura:
{
  "titulo": "Título criativo da atividade",
  "descricao": "Descrição geral em 2 a 3 frases",
  "intencionalidade": "Objetivo pedagógico em 1 a 2 frases",
  "materiais": ["material 1", "material 2"],
  "etapas": ["1. Etapa", "2. Etapa", "3. Etapa"],
  "duracao": "Duração estimada",
  "adaptacoes": "Adaptações inclusivas",
  "registroSugerido": "Forma de documentação"
}`;

    const atividade = await this.generateJson<AtividadeGeradaPayload>({
      prompt,
      systemInstruction:
        "Você é especialista em Educação Infantil brasileira. Use somente o contexto fornecido e responda apenas com JSON válido.",
      temperature: 0.5,
      maxTokens: 1500,
    });

    return {
      ...atividade,
      campoDeExperiencia: dto.campoDeExperiencia,
      objetivoBNCC: dto.objetivoBNCC,
      objetivoCurriculo: dto.objetivoCurriculo,
      faixaEtaria: faixaLabel,
      geradoPorIA: true,
    };
  }

  async gerarMicrogestos(params: {
    nomeAluno: string;
    faixaEtaria: string;
    observacoes: string;
    campoDeExperiencia: string;
  }): Promise<MicrogestosPayload> {
    const prompt = `Você é uma especialista em Educação Infantil e desenvolvimento infantil.

Com base nas observações fornecidas, sugira de 3 a 5 microgestos pedagógicos pequenos, intencionais e imediatos.

Criança: ${params.nomeAluno}
Faixa Etária: ${params.faixaEtaria}
Campo de Experiência: ${params.campoDeExperiencia}
Observações: ${params.observacoes}

Não faça diagnóstico clínico. Não invente fatos. Use apenas os dados fornecidos.

Retorne JSON:
{
  "microgestos": ["Ação concreta 1", "Ação concreta 2", "Ação concreta 3"],
  "justificativa": "Justificativa pedagógica breve"
}`;

    return this.generateJson<MicrogestosPayload>({
      prompt,
      systemInstruction:
        "Você é especialista em Educação Infantil brasileira. Responda somente com JSON válido e mantenha revisão humana.",
      temperature: 0.4,
      maxTokens: 800,
    });
  }

  private anonimizarNome(_nome: string, codigo: string): string {
    return `Aluno(a) ${codigo}`;
  }

  async gerarRelatorioConsolidadoLGPD(params: {
    childId: string;
    periodo: string;
  }): Promise<
    RelatorioAlunoPayload & {
      anonimizado: boolean;
      totalObservacoes: number;
      codigoAnonimizado: string;
    }
  > {
    const crianca = await this.prisma.child.findUnique({
      where: { id: params.childId },
      select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
    });

    if (!crianca) {
      throw new ServiceUnavailableException("Criança não encontrada.");
    }

    const codigoAnonimizado = `C-${params.childId.slice(-6).toUpperCase()}`;
    const nomeAnonimizado = this.anonimizarNome(
      `${crianca.firstName} ${crianca.lastName}`,
      codigoAnonimizado,
    );

    let faixaEtaria = "Criança Pequena (4 a 5 anos)";
    if (crianca.dateOfBirth) {
      const idadeMeses = Math.floor(
        (Date.now() - new Date(crianca.dateOfBirth).getTime()) /
          (1000 * 60 * 60 * 24 * 30.44),
      );
      if (idadeMeses <= 18) faixaEtaria = "Bebê (0 a 1 ano e 6 meses)";
      else if (idadeMeses <= 47)
        faixaEtaria = "Criança Bem Pequena (1a7m a 3a11m)";
      else faixaEtaria = "Criança Pequena (4 a 5 anos e 11 meses)";
    }

    const diaryEvents = await this.prisma.diaryEvent.findMany({
      where: { childId: params.childId },
      select: {
        description: true,
        observations: true,
        developmentNotes: true,
        behaviorNotes: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const observacoes: string[] = [];
    const nomes = [crianca.firstName, crianca.lastName]
      .filter(Boolean)
      .map((nome) => nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regexNome = nomes.length ? new RegExp(nomes.join("|"), "gi") : null;

    for (const event of diaryEvents) {
      const campos = [
        event.description,
        event.observations,
        event.developmentNotes,
        event.behaviorNotes,
      ].filter(Boolean) as string[];

      for (const campo of campos) {
        let observacao = campo.replace(
          /\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,}\s[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,}\b/g,
          nomeAnonimizado,
        );
        if (regexNome)
          observacao = observacao.replace(regexNome, nomeAnonimizado);
        observacoes.push(observacao);
      }
    }

    if (observacoes.length === 0) {
      throw new ServiceUnavailableException(
        "Não há observações suficientes. Registre pelo menos uma entrada no Diário de Bordo.",
      );
    }

    const resultado = await this.gerarRelatorioAluno({
      nomeAluno: nomeAnonimizado,
      faixaEtaria,
      observacoes: observacoes.slice(0, 20),
      periodo: params.periodo,
    });

    return {
      ...resultado,
      anonimizado: true,
      totalObservacoes: observacoes.length,
      codigoAnonimizado,
    };
  }

  async gerarRelatorioAluno(params: {
    nomeAluno: string;
    faixaEtaria: string;
    observacoes: string[];
    periodo: string;
  }): Promise<RelatorioAlunoPayload> {
    const observacoesTexto = params.observacoes
      .map((observacao, index) => `${index + 1}. ${observacao}`)
      .join("\n");

    const prompt = `Você é uma especialista em Educação Infantil e avaliação formativa.

Elabore um relatório baseado somente nas observações registradas.

Criança: ${params.nomeAluno}
Faixa Etária: ${params.faixaEtaria}
Período: ${params.periodo}
Observações:
${observacoesTexto}

Regras:
- não invente acontecimentos;
- não faça diagnóstico clínico;
- diferencie evidência de sugestão;
- use linguagem acessível;
- toda recomendação exige revisão humana.

Retorne JSON:
{
  "relatorio": "Texto em 3 a 4 parágrafos",
  "pontosFortess": ["Ponto forte 1", "Ponto forte 2"],
  "sugestoes": ["Sugestão revisável 1", "Sugestão revisável 2"]
}`;

    return this.generateJson<RelatorioAlunoPayload>({
      prompt,
      systemInstruction:
        "Você é especialista em Educação Infantil brasileira. Use somente os dados fornecidos e responda apenas com JSON válido.",
      temperature: 0.3,
      maxTokens: 1200,
    });
  }
}
