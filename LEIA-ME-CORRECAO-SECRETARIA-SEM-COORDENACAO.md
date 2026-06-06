# Correção verificada — Secretaria sem painel de Coordenação

Este ZIP foi gerado a partir do repositório enviado e corrige o ponto identificado:

- O perfil `UNIDADE_ADMINISTRATIVO` passa a renderizar apenas o menu da Secretaria.
- Mesmo que o usuário administrativo tenha outra role misturada, ele não herda os blocos de Direção, Nutrição, Coordenação Pedagógica ou Unidade Genérica.
- O menu da Secretaria não contém Painel da Coordenação, Turmas, Diário, RDIC, Requisições de Materiais ou Pedidos de Compra.
- A Secretaria fica focada em matrícula, ficha, faltas, atestados, documentos, saúde/ocorrências, atendimento aos pais, transporte, funcionários e comunicados administrativos.

Arquivos alterados:
- apps/web/src/components/layout/Sidebar.tsx
- apps/web/src/pages/SecretariaPage.tsx

Deploy:
- Apenas frontend.
- Sem migration.
- Sem alteração no banco.
- Sem alteração no backend.
