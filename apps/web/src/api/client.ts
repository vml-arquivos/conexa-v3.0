/**
 * Re-exporta o cliente HTTP padrão como `apiClient`
 * para uso nos módulos de API que seguem este padrão de importação.
 */
import http from './http';

export const apiClient = http;
export default http;
