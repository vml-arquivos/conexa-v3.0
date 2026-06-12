import { Injectable, Logger, OnModuleInit, Inject } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import {
  GoogleGenerativeAI,
  GenerativeModel,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import geminiConfig from "../../config/gemini.config";

export type GeminiProviderErrorCode =
  | "NOT_CONFIGURED"
  | "AUTH"
  | "MODEL_NOT_FOUND"
  | "RATE_LIMIT"
  | "BAD_REQUEST"
  | "TIMEOUT"
  | "NETWORK"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_RESPONSE"
  | "UNKNOWN";

export class GeminiProviderError extends Error {
  constructor(
    public readonly code: GeminiProviderErrorCode,
    message: string,
    public readonly providerStatus?: number,
  ) {
    super(message);
    this.name = "GeminiProviderError";
  }
}

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private ai: GoogleGenerativeAI | null = null;

  // Modelos cacheados para reúso
  private textModel: GenerativeModel | null = null;
  private visionModel: GenerativeModel | null = null;
  private thinkingModel: GenerativeModel | null = null;

  constructor(
    @Inject(geminiConfig.KEY)
    private config: ConfigType<typeof geminiConfig>,
  ) {}

  onModuleInit() {
    if (this.isEnabled()) {
      try {
        this.ai = new GoogleGenerativeAI(this.config.apiKey);
        this.logger.log("GeminiService inicializado com sucesso.");
      } catch (error) {
        this.logger.error("Falha ao inicializar o SDK do Gemini:", error);
        this.ai = null;
      }
    } else {
      this.logger.warn(
        "GEMINI_API_KEY não configurada. O serviço de IA ficará inativo.",
      );
    }
  }

  /**
   * Verifica se o serviço de IA está disponível (chave configurada).
   * Feature flags devem checar isso antes de acionar o serviço.
   */
  isEnabled(): boolean {
    return !!this.config.apiKey && this.config.apiKey.trim().length > 0;
  }

  /** Modelo efetivamente configurado para texto/JSON. */
  getConfiguredModel(): string {
    return this.config.textModel;
  }

  /**
   * Teste real, curto e sem dados pessoais. Útil para verificar chave, modelo,
   * cota e conectividade do container com a API do Gemini.
   */
  async healthCheck(): Promise<{
    ok: true;
    provider: "GEMINI";
    model: string;
    response: string;
  }> {
    if (!this.isEnabled()) {
      throw new GeminiProviderError(
        "NOT_CONFIGURED",
        "GEMINI_API_KEY não está configurada no container da API.",
      );
    }

    const response = await this.generateText(
      "Responda somente com a palavra OK.",
      "Este é um teste técnico de disponibilidade. Não use markdown.",
    );

    return {
      ok: true,
      provider: "GEMINI",
      model: this.config.textModel,
      response: response.trim(),
    };
  }

  private toProviderError(
    error: unknown,
    operation: string,
  ): GeminiProviderError {
    if (error instanceof GeminiProviderError) return error;

    const raw = error as {
      message?: string;
      status?: number;
      statusCode?: number;
      code?: string;
      response?: { status?: number };
    };
    const message = String(raw?.message ?? error ?? "Erro desconhecido");
    const normalized = message.toLowerCase();
    const status = raw?.status ?? raw?.statusCode ?? raw?.response?.status;

    let code: GeminiProviderErrorCode = "UNKNOWN";
    let friendly = "Falha inesperada ao acessar o Gemini.";

    if (
      status === 401 ||
      status === 403 ||
      normalized.includes("api key not valid") ||
      normalized.includes("invalid api key") ||
      normalized.includes("permission denied") ||
      normalized.includes("403 forbidden")
    ) {
      code = "AUTH";
      friendly =
        "A chave GEMINI_API_KEY foi recusada pelo Google. Confirme a chave e o projeto do Google AI Studio.";
    } else if (
      status === 404 ||
      normalized.includes("404 not found") ||
      (normalized.includes("model") && normalized.includes("not found"))
    ) {
      code = "MODEL_NOT_FOUND";
      friendly = `O modelo Gemini configurado não foi encontrado ou não está liberado: ${this.config.textModel}.`;
    } else if (
      status === 429 ||
      normalized.includes("quota") ||
      normalized.includes("rate limit") ||
      normalized.includes("resource exhausted") ||
      normalized.includes("429 too many requests")
    ) {
      code = "RATE_LIMIT";
      friendly =
        "A cota ou o limite de requisições do Gemini foi atingido. Verifique quotas e faturamento no Google AI Studio.";
    } else if (
      status === 400 ||
      normalized.includes("bad request") ||
      normalized.includes("invalid argument") ||
      normalized.includes("400 bad request")
    ) {
      code = "BAD_REQUEST";
      friendly =
        "O Gemini recusou os parâmetros da requisição. Verifique o modelo e a configuração de geração.";
    } else if (
      normalized.includes("timeout") ||
      normalized.includes("timed out") ||
      normalized.includes("abort")
    ) {
      code = "TIMEOUT";
      friendly = "A chamada ao Gemini excedeu o tempo limite.";
    } else if (
      normalized.includes("enotfound") ||
      normalized.includes("eai_again") ||
      normalized.includes("fetch failed") ||
      normalized.includes("network")
    ) {
      code = "NETWORK";
      friendly =
        "O container da API não conseguiu acessar o serviço do Gemini. Verifique DNS, firewall e saída HTTPS da VPS.";
    } else if (
      (status && status >= 500) ||
      normalized.includes("service unavailable") ||
      normalized.includes("503 service unavailable") ||
      normalized.includes("500 internal server error") ||
      normalized.includes("overloaded")
    ) {
      code = "PROVIDER_UNAVAILABLE";
      friendly =
        "O serviço do Gemini está temporariamente indisponível ou sobrecarregado.";
    } else if (normalized.includes("json")) {
      code = "INVALID_RESPONSE";
      friendly =
        "O Gemini respondeu, mas o conteúdo retornado não pôde ser interpretado como JSON.";
    }

    this.logger.error(
      `[${operation}] Gemini falhou: code=${code}; status=${status ?? "n/a"}; model=${this.config.textModel}; detail=${message}`,
    );

    return new GeminiProviderError(code, friendly, status);
  }

  /**
   * Configurações de segurança conservadoras.
   * IA atua apenas como sugestão; evitamos bloquear tudo, mas evitamos BLOCK_NONE.
   */
  private get defaultSafetySettings() {
    return [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];
  }

  private getTextModel(): GenerativeModel {
    if (!this.ai)
      throw new GeminiProviderError(
        "NOT_CONFIGURED",
        "GeminiService não está habilitado.",
      );
    if (!this.textModel) {
      this.textModel = this.ai.getGenerativeModel({
        model: this.config.textModel,
        safetySettings: this.defaultSafetySettings,
        generationConfig: {
          temperature: this.config.temperature,
        },
      });
    }
    return this.textModel;
  }

  private getVisionModel(): GenerativeModel {
    if (!this.ai)
      throw new GeminiProviderError(
        "NOT_CONFIGURED",
        "GeminiService não está habilitado.",
      );
    if (!this.visionModel) {
      this.visionModel = this.ai.getGenerativeModel({
        model: this.config.visionModel,
        safetySettings: this.defaultSafetySettings,
        generationConfig: {
          temperature: this.config.temperature,
        },
      });
    }
    return this.visionModel;
  }

  private getThinkingModel(): GenerativeModel {
    if (!this.ai)
      throw new GeminiProviderError(
        "NOT_CONFIGURED",
        "GeminiService não está habilitado.",
      );
    if (!this.thinkingModel) {
      this.thinkingModel = this.ai.getGenerativeModel({
        model: this.config.thinkingModel,
        safetySettings: this.defaultSafetySettings,
        generationConfig: {
          temperature: this.config.temperature,
        },
      });
    }
    return this.thinkingModel;
  }

  /**
   * Gera texto simples a partir de um prompt.
   */
  async generateText(
    prompt: string,
    systemInstruction?: string,
  ): Promise<string> {
    if (!this.isEnabled()) {
      throw new GeminiProviderError(
        "NOT_CONFIGURED",
        "Serviço de IA não configurado.",
      );
    }

    try {
      this.logger.debug(`Gerando texto. Prompt size: ${prompt.length} chars`);

      let model = this.getTextModel();

      // Se houver instrução de sistema, precisamos instanciar um modelo específico
      // pois a systemInstruction é passada na criação do modelo
      if (systemInstruction) {
        model = this.ai!.getGenerativeModel({
          model: this.config.textModel,
          systemInstruction,
          safetySettings: this.defaultSafetySettings,
          generationConfig: {
            temperature: this.config.temperature,
          },
        });
      }

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      throw this.toProviderError(error, "generateText");
    }
  }

  /**
   * Gera e faz o parse robusto de um JSON.
   */
  async generateJSON<T>(
    prompt: string,
    systemInstruction?: string,
  ): Promise<T> {
    if (!this.isEnabled()) {
      throw new GeminiProviderError(
        "NOT_CONFIGURED",
        "Serviço de IA não configurado.",
      );
    }

    try {
      this.logger.debug(`Gerando JSON. Prompt size: ${prompt.length} chars`);

      // Forçamos o modelo a retornar JSON
      let model = this.ai!.getGenerativeModel({
        model: this.config.textModel,
        systemInstruction: systemInstruction
          ? `${systemInstruction}\nIMPORTANTE: Retorne APENAS um JSON válido, sem formatação Markdown.`
          : "Retorne APENAS um JSON válido, sem blocos de código Markdown.",
        safetySettings: this.defaultSafetySettings,
        generationConfig: {
          temperature: 0.1, // Temperatura menor para JSON
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      return this.parseRobustJSON<T>(text);
    } catch (error) {
      throw this.toProviderError(error, "generateJSON");
    }
  }

  /**
   * Parse robusto de JSON para lidar com respostas que possam vir com Markdown.
   */
  private parseRobustJSON<T>(rawText: string): T {
    let cleanText = rawText.trim();

    // Tenta o parse direto primeiro
    try {
      return JSON.parse(cleanText) as T;
    } catch (e) {
      // Falhou. Vamos tentar extrair a substring entre o primeiro { e o último }
      // ou entre o primeiro [ e o último ]
      try {
        const firstBrace = cleanText.indexOf("{");
        const lastBrace = cleanText.lastIndexOf("}");
        const firstBracket = cleanText.indexOf("[");
        const lastBracket = cleanText.lastIndexOf("]");

        let startIndex = -1;
        let endIndex = -1;

        // Verifica se é um array ou objeto baseado em qual vem primeiro
        if (
          firstBrace !== -1 &&
          (firstBracket === -1 || firstBrace < firstBracket)
        ) {
          startIndex = firstBrace;
          endIndex = lastBrace;
        } else if (firstBracket !== -1) {
          startIndex = firstBracket;
          endIndex = lastBracket;
        }

        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          const extracted = cleanText.substring(startIndex, endIndex + 1);
          return JSON.parse(extracted) as T;
        }
      } catch (extractionError) {
        // Ignora o erro de extração e lança o erro amigável abaixo
      }

      this.logger.error("Falha ao fazer parse do JSON gerado pela IA");
      throw new Error("Resposta da IA não é um JSON válido.");
    }
  }

  /**
   * Analisa uma imagem base64 com um prompt.
   */
  async analyzeImage(
    image: { base64: string; mimeType: string },
    prompt: string,
  ): Promise<string> {
    if (!this.isEnabled()) {
      throw new GeminiProviderError(
        "NOT_CONFIGURED",
        "Serviço de IA não configurado.",
      );
    }

    try {
      this.logger.debug(
        `Analisando imagem. MimeType: ${image.mimeType}, Prompt size: ${prompt.length} chars`,
      );

      const model = this.getVisionModel();
      const imagePart = {
        inlineData: {
          data: image.base64,
          mimeType: image.mimeType,
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      return result.response.text();
    } catch (error) {
      throw this.toProviderError(error, "analyzeImage");
    }
  }

  /**
   * Raciocínio profundo para problemas complexos.
   */
  async deepThinking(problem: string): Promise<string> {
    if (!this.isEnabled()) {
      throw new GeminiProviderError(
        "NOT_CONFIGURED",
        "Serviço de IA não configurado.",
      );
    }

    try {
      this.logger.debug(`Deep thinking. Problem size: ${problem.length} chars`);

      const model = this.getThinkingModel();
      const result = await model.generateContent(problem);
      return result.response.text();
    } catch (error) {
      throw this.toProviderError(error, "deepThinking");
    }
  }
}
