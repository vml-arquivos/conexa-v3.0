# CoCris Site - TODO List - ATUALIZAÇÃO URGENTE

## PRIORIDADE MÁXIMA - Alterações Solicitadas

### Hero da Página Inicial
- [x] Copiar nova imagem hero fornecida para client/public/images/
- [x] Atualizar Home.tsx com nova imagem de fundo
- [x] Reduzir overlay vermelho (de rgba(227, 30, 36, 0.85) para bg-primary/30)
- [x] Remover degradê do overlay
- [x] Garantir que imagem fique visível e não distorcida

### Nomes Reais das Unidades
- [x] Acessar cocris.org para coletar nomes oficiais de todas as unidades
- [x] Atualizar banco de dados com nomes reais
- [x] Atualizar todas as páginas que exibem nomes de unidades
- [x] Verificar consistência em todo o site

### Imagem da Creche COCRIS
- [x] Copiar imagem da fachada amarela/azul fornecida
- [x] Atualizar banco de dados com nova imageUrl para Creche COCRIS
- [x] Verificar exibição na página de unidades

### Links do Menu (Header)
- [x] Acessar cocris.org e mapear todas as páginas do menu
- [x] Adicionar links faltantes no Header (Compliance, CEPIs e Creches, Notícias)
- [ ] Criar página Compliance se necessário
- [x] Testar navegação completa

---

## ✅ Concluído Anteriormente
- [x] Logo oficial da COCRIS
- [x] Paleta de cores da marca
- [x] Estrutura base do site
- [x] Sistema de blog e doações
- [x] Newsletter e contato

## Correções Urgentes
- [x] Adicionar Creche Rouxinol como 7ª unidade (Água Quente)
- [x] Atualizar banco de dados com informações da Creche Rouxinol
- [x] Adicionar foto da Creche Rouxinol ao projeto
- [x] Atualizar contador de unidades de 6 para 7

## FINALIZAÇÃO COMPLETA DO SITE - DEPLOY READY

### 1. Imagens Reais das Unidades
- [x] Buscar e adicionar fotos reais das 7 unidades educacionais
- [x] Otimizar imagens para web (compressão, tamanho adequado)
- [x] Adicionar alt text descritivo em todas as imagens

### 2. Integração de Dados Reais
- [x] Criar script seed-units.mjs com dados do units.json
- [x] Popular banco de dados com informações completas das 7 unidades
- [x] Adicionar coordenadas GPS para mapa interativo
- [x] Atualizar estatísticas reais (anos de história, crianças atendidas)

### 3. Sistema de Pagamentos Real
- [x] Integrar Stripe com chaves de teste (estrutura base criada)
- [x] Implementar fluxo completo de doação (cartão + PIX) (estrutura base)
- [ ] Adicionar geração de QR Code PIX (requer configuração Stripe)
- [ ] Implementar webhook para confirmação de pagamento (endpoint criado)
- [ ] Criar email automático de agradecimento
- [ ] Adicionar termômetro de metas de arrecadação

### 4. Páginas com Conteúdo Real
- [x] Completar página Compliance com textos reais
- [x] Revisar página Transparência com documentos reais
- [ ] Atualizar página Projetos com metas e progressos
- [ ] Adicionar página Unnijovem com descrição completa

### 5. SEO e Acessibilidade
- [x] Implementar Schema.org (Organization, EducationalOrganization, DonationAction)
- [x] Criar sitemap.xml dinâmico para Google Search Console
- [x] Adicionar meta tags completas em todas as páginas
- [ ] Implementar aria-labels e melhorar acessibilidade
- [ ] Verificar contraste de cores e responsividade

### 6. Configuração de Deploy
- [x] Criar arquivo .env.example com todas as variáveis (ENV_CONFIG.md)
- [x] Documentar processo de deploy no Coolify
- [ ] Configurar domínio cocris.casadef.com.br
- [ ] Testar build com pnpm build
- [ ] Validar todas as rotas após deploy

### 7. Testes Finais
- [ ] Testar fluxo completo de doação
- [ ] Verificar todas as páginas e navegação
- [ ] Testar responsividade em mobile/tablet/desktop
- [ ] Validar formulários de contato e newsletter
- [ ] Testar performance e otimizações

## Configuração de Porta para Coolify (Urgente)
- [x] Configurar servidor para porta 3001 (evitar conflito com backend na 3000)
- [x] Forçar host 0.0.0.0 no server/_core/index.ts
- [x] Atualizar vite.config.ts com porta 3001 e strictPort
- [x] Criar nixpacks.json para Node 20
- [x] Testar servidor na porta 3001

## Implementação Trabalhe Conosco e Correções de Rotas
- [ ] Criar schema de candidaturas no banco de dados
- [ ] Executar migração: pnpm db:push
- [ ] Implementar endpoint backend para candidaturas
- [ ] Criar página Trabalhe Conosco completa
- [ ] Corrigir links das unidades para usar slug (não ID)
- [ ] Corrigir rota dinâmica de detalhes da unidade
- [ ] Adicionar link Trabalhe Conosco no menu
- [ ] Testar build de produção
- [ ] Commit e push para GitHub
