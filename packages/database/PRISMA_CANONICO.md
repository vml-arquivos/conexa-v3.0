# Prisma canônico do Conexa

O schema e o histórico de migrations usados em produção pertencem a `apps/api/prisma`.

Este pacote permanece no monorepo por compatibilidade, mas seus comandos Prisma (`generate`, `migrate:*`, `studio`, `validate`) apontam explicitamente para `../../apps/api/prisma/schema.prisma`. Isso impede que um comando executado por engano neste workspace aplique o histórico legado de `packages/database/prisma/migrations` no banco de produção.

O arquivo `packages/database/prisma/schema.prisma` é mantido sincronizado apenas como espelho de compatibilidade. Não crie migrations novas nesta pasta; crie-as em `apps/api/prisma/migrations`.
