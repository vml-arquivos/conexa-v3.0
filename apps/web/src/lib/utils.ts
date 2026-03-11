import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extrai uma mensagem de erro legível de respostas de erro do NestJS.
 * O ValidationPipe retorna { message: string[] } quando há múltiplos erros.
 * Esta função normaliza para sempre retornar uma string com a primeira mensagem.
 */
export function extractErrorMessage(err: unknown, fallback = 'Ocorreu um erro inesperado'): string {
  if (!err) return fallback;
  const response = (err as any)?.response?.data;
  if (!response) {
    const msg = (err as any)?.message;
    return typeof msg === 'string' ? msg : fallback;
  }
  const { message } = response;
  if (Array.isArray(message) && message.length > 0) {
    return message[0] as string;
  }
  if (typeof message === 'string') return message;
  return fallback;
}
