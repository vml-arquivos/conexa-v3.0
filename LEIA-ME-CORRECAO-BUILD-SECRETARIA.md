# Correção final do build da Secretaria

Arquivo corrigido:
- apps/api/src/children/children.service.ts

Correção:
- Remove campos JSON administrativos do spread direto dos DTOs.
- Normaliza dadosResponsaveis, documentosMatricula, autorizadosRetirada, transporteEscolar e fichaAdministrativa antes de enviar ao Prisma.
- Corrige o build TypeScript do backend sem nova migration.

Banco:
- Não precisa nova alteração.
- As colunas já foram criadas manualmente com ADD COLUMN IF NOT EXISTS.
