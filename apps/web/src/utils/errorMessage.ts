export function getErrorMessage(err: unknown, fallback = 'Erro inesperado'): string {
  if (typeof err === 'string') return err;

  if (err && typeof err === 'object') {
    const e = err as {
      message?: unknown;
      response?: { data?: { message?: unknown } };
    };

    const msg = e.response?.data?.message ?? e.message;

    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.map(String).join(', ');
  }

  return fallback;
}
