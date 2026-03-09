-- Migration: adicionar EM_ENTREGA ao enum StatusPedidoCompra
-- Causa raiz: schema.prisma tem EM_ENTREGA mas a migration 20260218 criou o enum sem esse valor.
-- Operação segura: ADD VALUE IF NOT EXISTS (não destrutiva, não remove nada).
-- Timezone: America/Sao_Paulo

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StatusPedidoCompra')
    AND enumlabel = 'EM_ENTREGA'
  ) THEN
    ALTER TYPE "StatusPedidoCompra" ADD VALUE 'EM_ENTREGA' AFTER 'COMPRADO';
  END IF;
END $$;
