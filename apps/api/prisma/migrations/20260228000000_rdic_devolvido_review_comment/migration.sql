-- Migration: rdic_devolvido_review_comment
-- Descrição: Adiciona o status DEVOLVIDO ao enum StatusRDIX e o campo reviewComment ao RDIXInstancia
-- Tipo: Aditiva (sem breaking changes)
-- Autor: Manus AI
-- Data: 2026-02-28

-- 1. Adicionar o novo valor ao enum StatusRDIX (aditivo, não remove nenhum valor existente)
ALTER TYPE "StatusRDIX" ADD VALUE IF NOT EXISTS 'DEVOLVIDO';

-- 2. Adicionar o campo reviewComment ao modelo RDIXInstancia (nullable, sem default)
ALTER TABLE "RDIXInstancia" ADD COLUMN IF NOT EXISTS "reviewComment" TEXT;
