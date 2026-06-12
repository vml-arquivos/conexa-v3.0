# Plano de ação imediato — Zelare Intelligence Core

## Objetivo

Implantar a primeira camada segura de inteligência integrada no Conexa/Zelare, sem migration destrutiva, sem alterar matriz, sem alterar planos, sem alterar RDICs existentes e sem gravar dados históricos.

Esta entrega adiciona endpoints somente leitura que cruzam dados já existentes: criança, turma, frequência, diário, observações, RDIC, alergias/restrições, acompanhamento nutricional, atendimentos aos pais, planejamento e alertas.

## Entrega realizada neste pacote

### Backend

Novo módulo:

```txt
apps/api/src/intelligence-core/
  intelligence-core.module.ts
  intelligence-core.controller.ts
  intelligence-core.service.ts
```

Registro no AppModule:

```txt
apps/api/src/app.module.ts
```

Endpoints adicionados:

```txt
GET /intelligence-core/child/:childId/integral-profile
GET /intelligence-core/child/:childId/rdic-draft-context
GET /intelligence-core/classroom/:classroomId/overview
```

### Frontend

Novo cliente de API:

```txt
apps/web/src/api/intelligence-core.ts
```

## Garantias de segurança

- Somente leitura.
- Não cria, altera ou apaga registros.
- Não altera matriz curricular.
- Não altera planejamento.
- Não altera diário.
- Não altera RDIC existente.
- Não envia dados para IA externa.
- Não gera diagnóstico clínico.
- Não autoriza envio automático à família.
- Usa RBAC e escopo por mantenedora/unidade/turma.
- Restringe dados sensíveis por perfil.

## Como usar

### Perfil integral da criança

```http
GET /intelligence-core/child/{childId}/integral-profile?startDate=2026-01-01&endDate=2026-06-30
```

Retorna métricas, pontos de atenção, evidências e recomendações revisáveis.

### Contexto para RDIC

```http
GET /intelligence-core/child/{childId}/rdic-draft-context?startDate=2026-01-01&endDate=2026-06-30
```

Retorna seções sugeridas para rascunho de RDIC/relatório individual, com regras de segurança para uso futuro com Gemini/OpenAI.

### Visão da turma

```http
GET /intelligence-core/classroom/{classroomId}/overview?startDate=2026-06-01&endDate=2026-06-30
```

Retorna visão agregada da turma com flags por criança: baixa frequência, sem registros recentes, pontos de atenção, restrição alimentar e RDIC pendente.

## Próximos passos imediatos

1. Ligar estes endpoints ao `PainelInteligenciaPage`.
2. Adicionar cards no Painel do Professor e Coordenação usando `getClassroomIntelligenceOverview`.
3. Adicionar botão “Gerar contexto RDIC” no RDIC da criança usando `getRdicDraftContext`.
4. Criar etapa de revisão humana antes de qualquer texto gerado por IA externa.
5. Somente depois adicionar Gemini/OpenAI para redigir textos com base no JSON retornado.
