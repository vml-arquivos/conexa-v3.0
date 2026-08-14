import { IaAssistivaService } from './ia-assistiva.service';

describe('IaAssistivaService — disponibilidade do provedor', () => {
  const service = new IaAssistivaService({} as never);
  const internals = service as unknown as {
    aiRequestTimeoutMs: number;
    isRetryableProviderError: (error: unknown) => boolean;
  };

  it('mantém margem de 30 segundos para gerar o JSON pedagógico completo', () => {
    expect(internals.aiRequestTimeoutMs).toBe(30_000);
  });

  it('considera timeout explícito retryable para permitir fallback entre modelos', () => {
    expect(
      internals.isRetryableProviderError({ name: 'APIConnectionTimeoutError' }),
    ).toBe(true);
    expect(internals.isRetryableProviderError({ code: 'ETIMEDOUT' })).toBe(true);
    expect(
      internals.isRetryableProviderError({ code: 'UND_ERR_CONNECT_TIMEOUT' }),
    ).toBe(true);
  });

  it('mantém os códigos transitórios HTTP retryable e não reclassifica erros do cliente', () => {
    expect(internals.isRetryableProviderError({ status: 429 })).toBe(true);
    expect(internals.isRetryableProviderError({ status: 503 })).toBe(true);
    expect(internals.isRetryableProviderError({ status: 400 })).toBe(false);
    expect(internals.isRetryableProviderError(new Error('erro inesperado'))).toBe(
      false,
    );
  });
});
