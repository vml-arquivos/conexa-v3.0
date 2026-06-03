# Correção: Secretaria sem identidade de Coordenação

Este ZIP completo do repositório já está corrigido.

## Correção principal

A Secretaria é área administrativa da unidade, não Coordenação Pedagógica.

## Arquivos alterados

- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/pages/SecretariaPage.tsx`

## O que foi corrigido

1. Sidebar:
   - Perfil administrativo passa a renderizar somente o menu da Secretaria.
   - Mesmo que o usuário tenha múltiplos tipos/roles, Secretaria tem prioridade e não herda menu pedagógico.
   - Remove exposição de:
     - Painel da Coordenação
     - Turmas & Reuniões
     - Requisições de Materiais
     - Pedidos de Compra
     - Diário
     - RDIC
     - Inteligência
     - Relatórios pedagógicos
     - Alergias e Dietas como menu pedagógico
   - Secretaria fica focada em:
     - Matrículas e Fichas
     - Nova Matrícula
     - Cancelamentos/Transferências
     - Controle de Faltas
     - Atestados e Documentos
     - Saúde e Ocorrências
     - Atendimento aos Pais
     - Transporte e Retirada
     - Funcionários da Unidade
     - Comunicados Administrativos

2. Página da Secretaria:
   - Remove destaque de pedidos administrativos/compras.
   - Remove texto de coordenação.
   - Mantém o cockpit administrativo da unidade.
   - Foco em matrícula, ficha, faltas, atestados, saúde, documentos, responsáveis e funcionários.

## Sem banco

- Não há migration.
- Não há alteração no banco.
- Não há alteração no backend.
- Não há alteração em diário, planejamento, nutrição ou RDIC.

## Deploy

- Commitar.
- Deploy frontend.
- Backend não precisa ser redeployado para esta correção visual/UX.
