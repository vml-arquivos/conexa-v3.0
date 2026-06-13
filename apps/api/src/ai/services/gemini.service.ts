import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import geminiConfig from '../../config/gemini.config';

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
        this.logger.log('GeminiService inicializado com sucesso.');
      } catch (error) {
        this.logger.error('Falha ao inicializar o SDK do Gemini:', error);
        this.ai = null;
      }
    } else {
      this.logger.warn(
        'GEMINI_API_KEY não configurada. O serviço de IA ficará inativo.',
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
    if (!this.ai) throw new Error('GeminiService não está habilitado.');
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
    if (!this.ai) throw new Error('GeminiService não está habilitado.');
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
    if (!this.ai) throw new Error('GeminiService não está habilitado.');
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
      throw new Error('Serviço de IA não configurado.');
    }

    try {
      this.logger.debug(
        `Gerando texto. Prompt size: ${prompt.length} chars`,
      );
      
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
      this.logger.error('Erro em generateText', error);
      throw new Error('Falha ao gerar texto via IA.');
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
      throw new Error('Serviço de IA não configurado.');
    }

    try {
      this.logger.debug(
        `Gerando JSON. Prompt size: ${prompt.length} chars`,
      );

      // Forçamos o modelo a retornar JSON
      let model = this.ai!.getGenerativeModel({
        model: this.config.textModel,
        systemInstruction: systemInstruction 
          ? `${systemInstruction}\nIMPORTANTE: Retorne APENAS um JSON válido, sem formatação Markdown.`
          : 'Retorne APENAS um JSON válido, sem blocos de código Markdown.',
        safetySettings: this.defaultSafetySettings,
        generationConfig: {
          temperature: 0.1, // Temperatura menor para JSON
          responseMimeType: 'application/json',
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      return this.parseRobustJSON<T>(text);
    } catch (error) {
      this.logger.error('Erro em generateJSON', error);
      throw new Error('Falha ao gerar ou processar JSON via IA.');
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
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        const firstBracket = cleanText.indexOf('[');
        const lastBracket = cleanText.lastIndexOf(']');

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

      this.logger.error('Falha ao fazer parse do JSON gerado pela IA');
      throw new Error('Resposta da IA não é um JSON válido.');
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
      throw new Error('Serviço de IA não configurado.');
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
      this.logger.error('Erro em analyzeImage', error);
      throw new Error('Falha ao analisar imagem via IA.');
    }
  }

  /**
   * Raciocínio profundo para problemas complexos.
   */
  async deepThinking(problem: string): Promise<string> {
    if (!this.isEnabled()) {
      throw new Error('Serviço de IA não configurado.');
    }

    try {
      this.logger.debug(
        `Deep thinking. Problem size: ${problem.length} chars`,
      );

      const model = this.getThinkingModel();
      const result = await model.generateContent(problem);
      return result.response.text();
    } catch (error) {
      this.logger.error('Erro em deepThinking', error);
      throw new Error('Falha no raciocínio profundo via IA.');
    }
  }
}
