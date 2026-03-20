/**
 * Testes unitários para GeminiService e AiController
 *
 * Todos os testes são offline (sem rede) — o SDK @google/generative-ai é mockado.
 *
 * Casos cobertos:
 * 1. Sem API key → isEnabled() = false, app não quebra
 * 2. Sem API key → endpoint /ping retorna 503
 * 3. Com API key → isEnabled() = true, SDK inicializado
 * 4. generateText → retorna texto correto
 * 5. generateText → erro controlado (não vaza apiKey)
 * 6. generateJSON → parse direto
 * 7. generateJSON → parse com extração de substring (resposta com markdown)
 * 8. generateJSON → lança erro amigável quando JSON é inválido
 * 9. analyzeImage → retorna texto correto
 * 10. deepThinking → retorna texto correto
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { GeminiService } from './services/gemini.service';
import { AiController } from './ai.controller';
import geminiConfig from '../config/gemini.config';

// ─── Mock do SDK @google/generative-ai ───────────────────────────────────────
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  },
  HarmBlockThreshold: {
    BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
  },
}));

// ─── Helper para criar módulo com config ─────────────────────────────────────
async function createModule(apiKey: string) {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [AiController],
    providers: [
      GeminiService,
      {
        provide: geminiConfig.KEY,
        useValue: {
          apiKey,
          textModel: 'gemini-2.0-flash-exp',
          visionModel: 'gemini-2.0-flash-exp',
          thinkingModel: 'gemini-2.0-flash-thinking-exp-1219',
          temperature: 0.3,
        },
      },
    ],
  }).compile();

  const service = module.get<GeminiService>(GeminiService);
  const controller = module.get<AiController>(AiController);
  return { module, service, controller };
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('GeminiService — sem API key', () => {
  let service: GeminiService;

  beforeEach(async () => {
    const { service: s } = await createModule('');
    service = s;
    service.onModuleInit();
  });

  it('isEnabled() deve retornar false quando não há API key', () => {
    expect(service.isEnabled()).toBe(false);
  });

  it('não deve quebrar o app durante a inicialização (onModuleInit)', () => {
    // Se chegou aqui sem exceção, o app não quebrou
    expect(service).toBeDefined();
  });

  it('generateText deve lançar erro controlado (não ServiceUnavailableException)', async () => {
    await expect(service.generateText('Olá')).rejects.toThrow(
      'Serviço de IA não configurado.',
    );
  });

  it('generateJSON deve lançar erro controlado', async () => {
    await expect(service.generateJSON('query')).rejects.toThrow(
      'Serviço de IA não configurado.',
    );
  });

  it('analyzeImage deve lançar erro controlado', async () => {
    await expect(
      service.analyzeImage({ base64: 'abc', mimeType: 'image/jpeg' }, 'prompt'),
    ).rejects.toThrow('Serviço de IA não configurado.');
  });

  it('deepThinking deve lançar erro controlado', async () => {
    await expect(service.deepThinking('problema')).rejects.toThrow(
      'Serviço de IA não configurado.',
    );
  });
});

describe('AiController — sem API key → 503', () => {
  let controller: AiController;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    process.env.NODE_ENV = 'development'; // Garante que não está em produção
    const { controller: c, service } = await createModule('');
    service.onModuleInit();
    controller = c;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('ping deve retornar 503 quando IA não está configurada', async () => {
    await expect(controller.ping()).rejects.toThrow(ServiceUnavailableException);
    await expect(controller.ping()).rejects.toThrow('IA não configurada');
  });
});

describe('AiController — em produção → 503', () => {
  let controller: AiController;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    process.env.NODE_ENV = 'production';
    const { controller: c, service } = await createModule('fake-key-for-prod-test');
    service.onModuleInit();
    controller = c;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('ping deve retornar 503 em ambiente de produção', async () => {
    await expect(controller.ping()).rejects.toThrow(ServiceUnavailableException);
    await expect(controller.ping()).rejects.toThrow('Endpoint indisponível em produção');
  });
});

describe('GeminiService — com API key (mock SDK)', () => {
  let service: GeminiService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const { service: s } = await createModule('fake-api-key-1234');
    service = s;
    service.onModuleInit();
  });

  it('isEnabled() deve retornar true quando há API key', () => {
    expect(service.isEnabled()).toBe(true);
  });

  it('generateText deve retornar o texto da resposta do SDK', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'Olá! Como posso ajudar?' },
    });

    const result = await service.generateText('Olá!');
    expect(result).toBe('Olá! Como posso ajudar?');
    expect(mockGetGenerativeModel).toHaveBeenCalled();
  });

  it('generateText com systemInstruction deve criar um novo modelo', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'Resposta com instrução de sistema' },
    });

    const result = await service.generateText('Prompt', 'Seja conciso.');
    expect(result).toBe('Resposta com instrução de sistema');
  });

  it('generateText deve lançar erro amigável quando o SDK falha', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Network error'));

    await expect(service.generateText('Olá')).rejects.toThrow(
      'Falha ao gerar texto via IA.',
    );
  });

  it('generateText não deve vazar a apiKey no erro', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Unauthorized: fake-api-key-1234'));

    try {
      await service.generateText('Olá');
      fail('Deveria ter lançado erro');
    } catch (error: any) {
      expect(error.message).not.toContain('fake-api-key-1234');
      expect(error.message).toBe('Falha ao gerar texto via IA.');
    }
  });

  it('generateJSON deve fazer parse direto de JSON válido', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => '{"nome":"João","idade":30}' },
    });

    const result = await service.generateJSON<{ nome: string; idade: number }>(
      'Retorne um JSON',
    );
    expect(result).toEqual({ nome: 'João', idade: 30 });
  });

  it('generateJSON deve extrair JSON de resposta com markdown', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          '```json\n{"nome":"Maria","score":95}\n```',
      },
    });

    const result = await service.generateJSON<{ nome: string; score: number }>(
      'Retorne um JSON',
    );
    expect(result).toEqual({ nome: 'Maria', score: 95 });
  });

  it('generateJSON deve lançar erro amigável quando JSON é completamente inválido', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'Não consigo gerar um JSON para isso.' },
    });

    await expect(
      service.generateJSON('query inválida'),
    ).rejects.toThrow('Falha ao gerar ou processar JSON via IA.');
  });

  it('analyzeImage deve chamar o modelo vision com o inlineData correto', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'Imagem contém uma criança brincando.' },
    });

    const result = await service.analyzeImage(
      { base64: 'base64data', mimeType: 'image/png' },
      'O que há na imagem?',
    );

    expect(result).toBe('Imagem contém uma criança brincando.');
    expect(mockGenerateContent).toHaveBeenCalledWith([
      'O que há na imagem?',
      { inlineData: { data: 'base64data', mimeType: 'image/png' } },
    ]);
  });

  it('analyzeImage deve respeitar o mimeType fornecido (não fixar jpeg)', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'Análise de PDF' },
    });

    await service.analyzeImage(
      { base64: 'pdfdata', mimeType: 'application/pdf' },
      'Analise este documento',
    );

    expect(mockGenerateContent).toHaveBeenCalledWith([
      'Analise este documento',
      { inlineData: { data: 'pdfdata', mimeType: 'application/pdf' } },
    ]);
  });

  it('deepThinking deve retornar a resposta do modelo thinking', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'Análise profunda do problema pedagógico.' },
    });

    const result = await service.deepThinking('Como melhorar o aprendizado?');
    expect(result).toBe('Análise profunda do problema pedagógico.');
  });
});

describe('AiController — com API key (mock SDK)', () => {
  let controller: AiController;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
    const { controller: c, service } = await createModule('fake-api-key-1234');
    service.onModuleInit();
    controller = c;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('ping deve retornar status ok com a resposta da IA', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'Olá! Estou funcionando.' },
    });

    const result = await controller.ping();
    expect(result).toEqual({
      status: 'ok',
      provider: 'Google Gemini',
      response: 'Olá! Estou funcionando.',
    });
  });

  it('ping deve retornar 503 quando o SDK falha', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API error'));

    await expect(controller.ping()).rejects.toThrow(ServiceUnavailableException);
    await expect(controller.ping()).rejects.toThrow('Falha ao comunicar com a IA');
  });
});
