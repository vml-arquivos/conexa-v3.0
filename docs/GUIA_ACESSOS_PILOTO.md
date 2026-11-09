# Guia de Acessos — Ambiente Piloto (Conexa V3)

Senha de todos os logins: **Teste@123** (ou o valor de `PILOTO_SENHA` usado ao rodar o seed).
Tudo do piloto fica em uma **Mantenedora própria** ("ASSOCIAÇÃO PILOTO"). Quem entra com estes logins não vê dados reais.

| Login | Papel | Entra em | O que testar (15 min) |
|---|---|---|---|
| mantenedora@piloto.conexa.test | Administrador da Mantenedora | Painel de Administração | Ver unidades, turmas, usuários, ordens de serviço por unidade, pedidos de compra |
| financeiro@piloto.conexa.test | Financeiro | Pedidos de compra | Pedidos das duas unidades, itens e valores |
| coordgeral@piloto.conexa.test | Coordenação Geral | Painel Coord. Geral | Comparar Unidade A x B, frequência, planejamentos, observações |
| psicologia@piloto.conexa.test | Psicologia Central | Painel Psicologia | Crianças com laudo (TEA, TDAH, Down), observações e alertas |
| diretor.a / diretor.b @piloto.conexa.test | Diretor(a) | Painel do Diretor | Visão da unidade; **abrir ordem de serviço** e avaliar a execução |
| coordenador.a / coordenador.b @… | Coordenação da unidade | Painel Coord. Pedagógica | Planejamentos (um em rascunho para aprovar), diário, observações |
| secretaria.a / secretaria.b @… | Secretaria | Secretaria | Matrículas, faltas e justificativas (há criança com 4 faltas) |
| nutricionista.a / nutricionista.b @… | Nutricionista | Painel Nutricionista | Cardápio de 4 semanas, painel de alergias/restrições |
| professor.a1, a2, b1, b2 @… | Professor | Painel do Professor | Chamada, diário de bordo, plano de aula, observações |
| manutencao1 / manutencao2 @piloto.conexa.test | Manutenção | Minhas Ordens de Serviço | Aceitar, definir prazo, executar, enviar relatório e fotos |

## Crianças de exemplo (10 por turma, 4 turmas = 40)
Cada turma repete os cenários: sem particularidade · APLV · alergia a amendoim · intolerância à lactose · doença celíaca · TEA (laudo) · TDAH + medicação · alergia a ovo + asma · Down (laudo) + textura pastosa · sem carne suína + muitas faltas.

## Material e relatórios
- 5 requisições de material (rascunho, solicitado, aprovado, entregue, rejeitada) + 2 pedidos de compra (um por unidade).
- 40 relatórios individuais (RDIC), um por criança, em estados variados: publicado, aprovado, em revisão, rascunho e devolvido.

## Ordens de serviço de exemplo
7 chamados já cobrem todos os estados: aberta, aceita, em execução (atrasada), aguardando avaliação, encerrada (executada), encerrada (parcial/reaberta) e cancelada.

## Roteiro rápido de aceite
1. Diretor A abre uma OS nova (o quê, onde, prioridade, anexa foto).
2. Manutenção 1 vê a OS na fila, aceita e define o prazo.
3. Manutenção 1 inicia, conclui e envia relatório + foto.
4. Diretor A avalia (executado / parcial / não executado). Se parcial, a OS volta para a manutenção.
5. Mantenedora vê a OS e os indicadores no Painel de Administração.
6. No celular (Chrome/Safari): abrir o site, "Adicionar à tela inicial", entrar como manutenção e repetir o passo 2.
