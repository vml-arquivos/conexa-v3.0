/**
 * Utilitário de exportação de dados para CSV
 * Usado nos dashboards central e de unidade
 */

/**
 * Converte um array de objetos em string CSV
 */
export function converterParaCSV(dados: Record<string, unknown>[]): string {
  if (!dados || dados.length === 0) return '';

  const cabecalhos = Object.keys(dados[0]);
  const linhas = dados.map((linha) =>
    cabecalhos
      .map((col) => {
        const valor = linha[col];
        if (valor === null || valor === undefined) return '';
        const str = String(valor);
        // Escapar aspas duplas e envolver em aspas se necessário
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(','),
  );

  return [cabecalhos.join(','), ...linhas].join('\n');
}

/**
 * Faz o download de um arquivo CSV no navegador
 */
export function baixarCSV(
  dados: Record<string, unknown>[],
  nomeArquivo: string,
): void {
  const csv = converterParaCSV(dados);
  if (!csv) return;

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${nomeArquivo}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formata uma data para exibição em PT-BR
 */
export function formatarData(data: string | Date): string {
  return new Date(data).toLocaleDateString('pt-BR');
}

/**
 * Formata um número com separador de milhar PT-BR
 */
export function formatarNumero(num: number): string {
  return num.toLocaleString('pt-BR');
}
