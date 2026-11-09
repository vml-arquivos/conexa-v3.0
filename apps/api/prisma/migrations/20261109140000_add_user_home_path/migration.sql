-- Painel de destino configurável por usuário — ADITIVA (coluna opcional).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "homePath" VARCHAR(100);
