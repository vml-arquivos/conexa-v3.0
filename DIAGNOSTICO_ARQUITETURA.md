# Diagnóstico da Arquitetura e Plano de Ação: Conexa V3.0

**Data:** 21 de Fevereiro de 2026
**Agente Responsável:** Manus AI

## 1. Introdução

Este documento apresenta uma análise detalhada do repositório `vml-arquivos/conexa-v3.0`, conforme as diretrizes do protocolo de handover. O objetivo é validar a arquitetura existente, confirmar o estado atual do projeto e estabelecer um plano de ação claro para as próximas missões de desenvolvimento: a implementação do **Cockpit do Professor** com mutações otimistas e a criação do **Motor de IA Assistiva** com anonimização de dados (LGPD).

A análise foi realizada através da clonagem do repositório, exploração de sua estrutura de arquivos e leitura aprofundada dos componentes-chave da aplicação.

## 2. Confirmação da Arquitetura (DNA)

A análise do código-fonte confirma integralmente a arquitetura descrita no protocolo. O projeto é um monorepo robusto gerenciado com **PNPM Workspaces**, promovendo excelente separação de responsabilidades e manutenibilidade.

| Camada | App/Package | Tecnologia | Análise e Confirmação |
| :--- | :--- | :--- | :--- |
| **Backend API** | `apps/api` | NestJS, Prisma, JWT | A estrutura de módulos do NestJS está bem organizada. O `app.module.ts` importa corretamente todos os módulos de funcionalidades, como `DiaryEventModule` e `IaAssistivaModule`. O `schema.prisma` é a espinha dorsal do banco de dados, definindo de forma clara as relações multi-tenant e os modelos de dados. |
| **Frontend Web** | `apps/web` | React, Vite, Axios | A aplicação utiliza `axios` para comunicação com a API, encapsulado em `api/http.ts`. A estrutura de componentes, páginas e hooks está bem definida. **A biblioteca TanStack Query (`react-query`) não está instalada**, sendo um passo inicial e crucial para a próxima missão. |
| **Banco de Dados** | `packages/database` | PostgreSQL, Prisma | O `schema.prisma` é completo e detalhado, com mais de 1700 linhas, definindo todos os modelos, enums e relações. As migrações estão presentes, e o último commit (`b040e5e`) reflete uma correção de alinhamento entre o schema e os serviços, confirmando a estabilidade. |
| **Site Institucional** | `apps/site` | React, Vite | Estrutura confirmada como uma aplicação estática simples, separada da aplicação principal. |

## 3. Diagnóstico e Pontos de Atenção

A partir da análise, foram identificados os seguintes pontos de atenção e preparação para as próximas tarefas:

### 3.1. Frontend: Preparação para o Cockpit do Professor

- **Dependência Ausente:** A principal tarefa no frontend é a implementação de mutações otimistas. No entanto, a dependência `@tanstack/react-query` não está presente no `package.json` do workspace `apps/web`. A instalação desta biblioteca é o primeiro passo obrigatório.
- **Estado Atual:** O componente `TeacherDashboardPage.tsx` e o `DiarioBordoPage.tsx` utilizam uma abordagem tradicional de `useState` e `useEffect` para gerenciar o estado e fazer chamadas à API. A lógica de salvamento, como a função `salvarDiario`, realiza uma chamada `http.post` e aguarda a resposta para atualizar a UI, o que resulta na experiência de usuário que se deseja eliminar.
- **Plano de Ação (Frontend):**
  1.  **Instalar TanStack Query:** Adicionar a dependência ao `apps/web`.
  2.  **Prover o QueryClient:** Envolver a aplicação com o `QueryClientProvider`.
  3.  **Refatorar `salvarDiario`:** Substituir a chamada `http.post` direta por um hook `useMutation` do TanStack Query.
  4.  **Implementar Mutação Otimista:** Utilizar as funções `onMutate`, `onError` e `onSuccess` do `useMutation` para atualizar a interface do usuário instantaneamente e garantir a consistência dos dados.

### 3.2. Backend: Preparação para o Motor de IA Assistiva (LGPD)

- **Estrutura Pronta:** O backend (`apps/api`) já possui a estrutura necessária. O `ia-assistiva.module.ts` e `ia-assistiva.service.ts` estão prontos para serem estendidos. O `ia.controller.ts` já expõe outros endpoints de IA, servindo como modelo.
- **Dados Sensíveis Identificados:** A análise do `schema.prisma` confirma a presença de dados pessoais que precisam ser anonimizados. Os principais campos são:
    - **No modelo `Child`:** `firstName`, `lastName`.
    - **No modelo `User` (Professor):** `firstName`, `lastName` (acessível via `createdBy` no `DiaryEvent`).
- **Plano de Ação (Backend):**
  1.  **Criar o Método de Serviço:** Adicionar a função `gerarRelatorioConsolidadoLGPD(childId: string, periodo: { de: Date, ate: Date })` ao `ia-assistiva.service.ts`.
  2.  **Coletar Dados:** Dentro do novo método, utilizar o Prisma para buscar todos os `DiaryEvent`s e dados associados (anotações, microgestos) para a criança e o período especificados.
  3.  **Desenvolver a Função de Anonimização:** Criar uma função utilitária que receba o texto a ser enviado à IA e utilize expressões regulares (Regex) para substituir nomes de crianças e professores por placeholders como `[CRIANÇA]` e `[PROFESSOR_A]`.
  4.  **Construir o Prompt:** Montar o prompt para a API Gemini utilizando exclusivamente os dados já anonimizados.
  5.  **Criar o Endpoint:** Adicionar um novo endpoint `@Post('/ia/relatorio-consolidado')` no `ia.controller.ts` que invoca o novo método do serviço.

## 4. Conclusão e Próximos Passos

O diagnóstico confirma que a base de código do Conexa V3.0 é sólida, bem-estruturada e pronta para as evoluções planejadas. Os pré-requisitos e os planos de ação para ambas as frentes de trabalho (Frontend e Backend) estão claros.

Conforme o protocolo de handover, a próxima etapa é solicitar formalmente os arquivos vitais para dar início à fase de implementação. A análise prévia destes arquivos já permitiu a construção deste diagnóstico detalhado, e agora eles servirão como base para o desenvolvimento efetivo.
