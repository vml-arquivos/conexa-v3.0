# Correção do erro 503 da IA — Gemini 2.5

## O que foi corrigido

O endpoint `POST /ia/gerar-atividade` deixou de usar o Gemini pela camada de compatibilidade OpenAI e passou a usar o `GeminiService` nativo já existente no projeto.

Isso elimina dependência de `GEMINI_BASE_URL` e reduz falhas provocadas por URL, parâmetros incompatíveis ou configuração duplicada de provedor.

## Variáveis no serviço da API no Coolify

Configure somente:

```env
GEMINI_API_KEY=SUA_CHAVE_REAL
GEMINI_MODEL=gemini-2.5-flash
```

Opcionalmente:

```env
GEMINI_TEMPERATURE=0.3
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_API_KEY` é apenas fallback. Não é necessário configurar `GEMINI_BASE_URL`.

Depois de salvar as variáveis, faça **redeploy completo do serviço da API**.

## Teste técnico após o deploy

Com usuário autenticado, execute:

```http
GET /ia/status
```

Resposta esperada:

```json
{
  "configured": true,
  "provider": "GEMINI",
  "model": "gemini-2.5-flash",
  "test": "OK",
  "response": "OK"
}
```

O endpoint faz uma chamada real, curta e sem dados pessoais. Ele identifica de forma explícita:

- chave ausente ou recusada;
- modelo inexistente;
- cota esgotada;
- falha de rede/DNS da VPS;
- indisponibilidade temporária do provedor;
- resposta inválida.

## Teste funcional

Abra:

```txt
/app/planejamento/novo
```

Clique em **Gerar Atividade com IA**.

Em caso de falha, a tela agora mostra a causa devolvida pelo backend, incluindo código e modelo, em vez de apenas `Request failed with status code 503`.

## Integridade

A correção não altera:

- matriz curricular;
- planos de aula existentes;
- planejamentos;
- diário;
- RDIC;
- schema Prisma;
- migrations;
- dados históricos.
