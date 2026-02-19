# Resumo do Escopo Mestre - Conexa V2

## 1. Visão Geral do Sistema

**Nome**: Conexa V2

**Tipo**: Plataforma SaaS educacional (backend-first), multi-tenant, orientada à gestão pedagógica e documental da Educação Infantil.

**Propósito Principal**:
Centralizar, estruturar, validar e auditar todo o ciclo pedagógico da Educação Infantil — desde a **Matriz Curricular oficial**, passando pelo **planejamento pedagógico**, até o **registro diário (Diário de Bordo)** — garantindo **conformidade normativa, integridade de dados, rastreabilidade e escala multiunidade**.

**Problema Resolvido**:
- Fragmentação de registros pedagógicos
- Falta de vínculo entre planejamento, currículo e prática diária
- Ausência de auditoria e rastreabilidade normativa
- Risco de inconsistência curricular e jurídica
- Dificuldade de gestão multiunidade e multirole

**Objetivo Final**:
Ser a **fonte central e confiável** de dados pedagógicos da instituição (Mantenedora), garantindo que **toda atividade registrada esteja obrigatoriamente alinhada à Matriz Curricular oficial**, com auditoria completa e segurança institucional.

---

## 2. Contexto e Fundação

### Público-alvo:
- Mantenedoras de redes educacionais
- Equipes pedagógicas centrais
- Gestores de unidades
- Professores da Educação Infantil

### Cenário de uso:
- Redes educacionais com múltiplas unidades
- Necessidade de padronização curricular
- Registro diário de atividades pedagógicas
- Planejamento semanal/mensal baseado em currículo oficial
- Auditoria institucional e conformidade normativa

### Justificativa:
- A Educação Infantil exige **alinhamento rigoroso à BNCC e currículos oficiais**
- Sistemas genéricos não garantem vínculo real entre currículo → planejamento → prática
- A ausência de trilha auditável gera risco pedagógico, jurídico e institucional

### Valor gerado:
- Segurança pedagógica e jurídica
- Padronização curricular em escala
- Redução de erro humano
- Evidência auditável de práticas educacionais
- Base sólida para evolução futura (relatórios, IA, análises)

---

## 3. Arquitetura Definida (NÃO NEGOCIÁVEL)

### 3.1 Visão Arquitetural Geral

Arquitetura **modular backend**, orientada a domínio, com:
- **Multi-tenant por Mantenedora**
- **RBAC rigoroso por papel e escopo**
- **Banco relacional como fonte de verdade**
- **Importação controlada de dados normativos externos**

### 3.2 Componentes Principais

- **Backend da API**: NestJS
- **Camada de Persistência**: Prisma ORM + PostgreSQL
- **Banco de Dados**: Supabase Postgres (externo)
- **Autenticação**: JWT + Refresh Tokens
- **Auditoria**: Centralizada via AuditLog
- **Parser Normativo**: Importação de PDF curricular

### 3.3 Comunicação entre Componentes

- Comunicação interna síncrona (NestJS services)
- Nenhum uso de mensageria/fila neste estágio
- Banco como ponto de consistência

### 3.4 Stack Tecnológica Adotada (IMUTÁVEL)

- Node.js + TypeScript
- NestJS
- Prisma ORM
- PostgreSQL (Supabase)
- JWT
- Docker / Docker Compose (decisão tomada, não implementado ainda)
- Redis (decisão tomada, não implementado ainda)
- n8n (decisão tomada, não implementado ainda)
- React (frontend futuro, fora do escopo atual)

### 3.5 Premissas Arquiteturais

- **Banco de dados é a fonte da verdade**
- **Datas pedagógicas são comparadas por dia UTC (YYYY-MM-DD)**
- **Timezone funcional do negócio: America/Sao_Paulo**
- **Dados normativos não são alteráveis por usuários operacionais**

---

## 4. Mapa Funcional do Sistema

### 4.1 Módulos Existentes

#### Autenticação / RBAC
- Conecte-se
- Token de atualização
- Guards por role, permission e escopo
- Hierarquia de acesso

#### Mantenedora / Unidade
- Cadastro de mantenedora
- Cadastro de unidades
- Isolamento total de dados por mantenedora

#### Usuários e Papéis
- Usuários
- Funções
- Permissões
- Escopo por unidade (UserRoleUnitScope)

#### Matriz Curricular
- Cadastro da matriz por ano/segmento
- Controle de versões
- Ativação
- Fonte da Verdade normativa

#### Entradas da Matriz Curricular
- Um registro por **dia letivo**
- Campo de Experiência
- Objetivos BNCC
- Objetivos do Currículo
- Intencionalidade
- Exemplos de atividade

#### Importação de Matriz (PDF)
- Analisador oficial de PDF
- Ensaio geral
- Aplicar
- Idempotência por (matrixId, date)
- Auditoria

#### Planejamento Pedagógico (v2)
- Planejamento vinculado à Matriz
- Período definido
- Base para o Diário

#### Diário de Bordo
- Registro diário obrigatório
- Vínculo obrigatório com:
  - Planning ativo
  - CurriculumMatrixEntry do mesmo dia
- 8 validações críticas de integridade

### 4.2 Fluxos Principais

1. Criar Matriz Curricular
2. Importar PDF oficial da matriz
3. Planejar período pedagógico
4. Registrar atividades diárias
5. Auditar ações

### 4.3 Funcionalidades Críticas

- Importação correta e idempotente da matriz
- Vínculo obrigatório Diário ↔ Planejamento ↔ Currículo
- Auditoria completa

### 4.4 Funcionalidades Futuras Previstas

- Relatórios pedagógicos
- Integração com IA (análise e apoio, não decisão)
- Automações via n8n
- Frontend React

---

## 5. Estrutura de Usuários e Acessos

### Papéis

- **DESENVOLVEDOR** – ignorar totalmente
- **MANTENEDORA** – autoridade máxima pedagógica
- **STAFF_CENTRAL** – gestão curricular e planejamento
- **UNIDADE** – gestão local
- **PROFESSOR** – execução pedagógica

### Hierarquia

```
DESENVOLVEDOR
→ MANTENEDORA
→ STAFF_CENTRAL
→ UNIDADE
→ PROFESSOR
```

### Regras

- **Importação curricular**: apenas MANTENEDORA / STAFF_CENTRAL
- **Diário**: PROFESSOR, com validações
- **Planejamento**: STAFF_CENTRAL / UNIDADE (dependendo do escopo)

---

## 6. Requisitos Adicionais Identificados

### Templates de Planejamento
- Baseados na Sequência Pedagógica Piloto 2026
- Templates pré-prontos para uso offline
- Geração de templates com IA

### Modo Offline (App Mobile)
- Professores podem usar offline
- Sincronização posterior com sistema central
- Envio de carga de dados quando conectado

### Personalização Multi-tenant
- Site institucional personalizável por tenant
- Múltiplos templates de site
- Criação/edição de páginas
- Configurações por tenant:
  - Adicionar/editar unidades
  - Adicionar/editar alunos
  - Adicionar/editar professores
  - Adicionar/editar funcionários

### IA Assistiva
- Motor de IA para análises
- Auxílio em relatórios (RD, RIA)
- Seguindo sequência piloto e matriz curricular
- **NÃO decisória, apenas assistiva**

---

## 7. Dashboards por Nível de Acesso

### Professor
- Minha turma hoje
- Registro rápido de microgestos
- Plano do dia vinculado à matriz
- Pendências

### Coordenação da Unidade
- Visão da unidade (hoje/semana)
- Pendências por turma
- Alertas (alimentar/saúde/emocional)
- Planejamentos por professor

### Staff Central (Pedagógico e Psicologia)
- Comparativos por unidade
- Aderência à matriz/BNCC
- Saúde de registros (coverage)
- Heatmap de alertas

### Mantenedora
- Visão macro: unidades, usuários, governança
- Compras/pedidos e custos
- Relatórios consolidados

---

## 8. Princípios de UX

- **"1 toque"** para registrar rotina
- **Sem UUID na tela** - Tudo por select/combobox (Unidade → Turma → Criança)
- **Workflow guiado** com "próximo passo"
- **Dados e relatórios nascem do cotidiano**: microeventos → evidências → relatórios
- **Alertas claros e acionáveis** (sem ruído)

---

## 9. Conformidade e Segurança

- Alinhamento rigoroso à **BNCC**
- Conformidade com **Currículo em Movimento DF**
- Auditoria completa de todas as ações
- Isolamento total de dados por tenant (Mantenedora)
- RBAC granular por papel e escopo
- Proteção de dados sensíveis de crianças

---

**Fonte**: ESCOPOMestreConexaV2.pdf (páginas 1-5)
