/**
 * observacoes-gemini.prompt.ts
 *
 * Monta o prompt para o Gemini gerar observações individuais
 * a partir do conteúdo do plano de aula.
 */
export function buildObservacoesPrompt(pedagogicalContent: Record<string, any>): string {
  const conteudoTexto = JSON.stringify(pedagogicalContent, null, 2);

  return `Você é um assistente pedagógico especialista em educação infantil (0-6 anos).

Analise o conteúdo do plano de aula abaixo e gere uma lista de OBSERVAÇÕES INDIVIDUAIS que o professor deve fazer para cada criança durante ou após a atividade.

CONTEÚDO DO PLANO:
${conteudoTexto}

INSTRUÇÕES:
- Gere de 6 a 12 observações específicas ao conteúdo REAL deste plano
- Cada observação deve ser algo que o professor pode REALMENTE VERIFICAR observando uma criança
- Inclua observações positivas (o que a criança demonstrou dominar), de avanço (comportamento notável) e de atenção (o que pode precisar de retomada)
- Use linguagem simples, direta e objetiva (máximo 8 palavras)
- As observações devem ser aplicáveis a qualquer currículo/matriz, não só BNCC
- Não mencione "BNCC" ou códigos técnicos nas observações — use linguagem do cotidiano

FORMATO DE RESPOSTA (APENAS JSON, sem markdown):
{
  "observacoes": [
    {
      "id": "g001",
      "label": "texto curto da observação",
      "emoji": "emoji único representativo",
      "grupo": "plano",
      "origemObjetivo": "trecho do objetivo que originou esta observação"
    }
  ]
}`;
}
