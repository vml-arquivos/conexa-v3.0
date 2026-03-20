import { registerAs } from '@nestjs/config';

/**
 * Configuração do Google Gemini AI.
 *
 * Registrada como namespace 'gemini' para injeção via ConfigService.
 * Se GEMINI_API_KEY não estiver definida, o GeminiService fica "disabled"
 * e responde com erro controlado — sem derrubar o app.
 */
export default registerAs('gemini', () => ({
  /** Chave de API do Google AI Studio. Se ausente, o serviço fica desabilitado. */
  apiKey: process.env.GEMINI_API_KEY ?? '',

  /** Modelo padrão para geração de texto e JSON. */
  textModel: process.env.GEMINI_TEXT_MODEL ?? 'gemini-2.0-flash-exp',

  /** Modelo padrão para análise de imagens (vision). */
  visionModel: process.env.GEMINI_VISION_MODEL ?? 'gemini-2.0-flash-exp',

  /** Modelo para raciocínio profundo (thinking). */
  thinkingModel:
    process.env.GEMINI_THINKING_MODEL ?? 'gemini-2.0-flash-thinking-exp-1219',

  /** Temperatura de geração (0 = determinístico, 1 = criativo). */
  temperature: parseFloat(process.env.GEMINI_TEMPERATURE ?? '0.3'),
}));
