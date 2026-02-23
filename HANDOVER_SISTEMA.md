# Handover de Sistema: Conexa V3.0 (SaaS Educacional)

Este documento transfere o contexto total, arquitetura, decisões técnicas e roadmap do sistema Conexa V3.0 para o próximo agente ou desenvolvedor.

---

## 🚀 1. Estado Atual e Repositório
- **Repositório:** `vml-arquivos/conexa-v3.0`
- **Branch:** `main`
- **Último Commit:** `a39d815` (Painel Alergias, Dashboard Consumo, Exportar PDF)
- **Status de Build:** 
  - **Frontend (Vite/React):** 100% Passando (0 erros)
  - **Backend (NestJS):** 100% Passando (0 erros)
  - **Database (Prisma):** Migrations em dia até `20260222000000`

---

## 🏗️ 2. Arquitetura e Fluxos Implementados

### A. Fluxo RDIC (Relatório de Desenvolvimento Individual da Criança) em 3 Níveis
Implementado um motor de status e permissões para garantir a integridade dos relatórios:
1. **Professor (`/app/rdic-crianca`):** Cria e edita no status `RASCUNHO`. Envia para revisão.
2. **Coordenação Unidade (`/app/rdic-coord`):** Recebe em `EM_REVISAO`. Pode editar, devolver ao professor com parecer ou aprovar (`FINALIZADO` / `PUBLICADO`).
3. **Coordenação Geral (`/app/rdic-geral`):** Acesso somente leitura apenas para RDICs com status `PUBLICADO`.

### B. Motor de IA Assistiva LGPD
Localizado em `apps/api/src/ia-assistiva/ia-assistiva.service.ts`:
- **Função:** `gerarRelatorioConsolidadoLGPD`
- **Lógica:** Busca dados reais do `DiaryEvent`, anonimiza nomes reais por códigos (ex: `C-XXXXXX`) antes de enviar para o LLM, e retorna um rascunho estruturado para o professor.

### C. Gestão de Alergias e Dietas (Nutricionista)
- **Backend:** `GET /children/dietary-restrictions/unidade` (filtro automático por `unitId` do usuário).
- **Trigger:** Ao salvar uma restrição, o sistema cria automaticamente um `AlertaOperacional` e uma `Notificacao` para a coordenação e nutricionista.
- **Frontend:** `/app/painel-alergias` com destaque para casos severos e botão de impressão.

### D. Dashboard de Consumo de Materiais
- **Lógica:** Agrupamento de `MaterialRequest` por categoria (3 categorias principais para o professor) e turma.
- **Visualização:** Gráficos Recharts (Barras, Pizza e Barra de Progresso de Aprovação).

---

## 🛠️ 3. Guia de Desenvolvimento (Convenções)

- **Frontend:**
  - **Imports:** Usar `@/` para componentes UI e `../api/http` para chamadas API.
  - **Ícones:** Lucide-React.
  - **Componentes:** Usar `PageShell` como wrapper de todas as páginas.
  - **Chamadas API:** Sempre usar `http.get/post` (instância customizada do Axios).

- **Backend:**
  - **Módulos:** NestJS.
  - **Banco:** Prisma.
  - **Roles:** Usar decorator `@RequireRoles(RoleLevel.X)` e injetar `@CurrentUser() user: JwtPayload`.
  - **Níveis de Role:** `PROFESSOR` (10), `UNIDADE` (30), `STAFF_CENTRAL` (40), `DEVELOPER` (99).

---

## 🛤️ 4. Roadmap de Próximos Passos (Pendentes)

1. **RIA (Relatório de Intervenção e Acompanhamento):** Implementar a visualização em linha do tempo cronológica por criança para a coordenação.
2. **Notificações em Tempo Real:** Badge no Sidebar para alertas de alergias e RDICs aguardando revisão.
3. **Exportação de Relatórios:** Gerar PDF formal da Pauta de Coordenação e Relatório de Consumo em Excel.
4. **Integração N8N:** Configurar Webhooks nas tabelas `Notificacao` e `AlertaOperacional` para disparar mensagens externas.

---

## ⚠️ 5. Comandos Úteis no Servidor
- **Aplicar Migrations:** `npx prisma migrate deploy`
- **Build Frontend:** `pnpm build` no diretório `apps/web`
- **Build Backend:** `pnpm build` no diretório `apps/api`

---
**Transferência concluída. Sistema pronto para expansão.**
