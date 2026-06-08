-- CONEXA — Diagnóstico e Correção: Unidade Flamboyant Duplicada
-- Somente leitura na PARTE 1. Execute a PARTE 2 apenas se confirmado duplicado.
-- Backup antes de qualquer UPDATE/DELETE:
--   docker exec -it <container_id> pg_dump -U postgres postgres > backup_pre_flamboy.sql

-- ══════════════════════════════════════════════════════════════════════════════
-- PARTE 1 — DIAGNÓSTICO (somente leitura)
-- ══════════════════════════════════════════════════════════════════════════════

\echo '===================================================================='
\echo '1) Unidades com nome Flamboyant (verificar duplicata)'
\echo '===================================================================='
SELECT
  id,
  name,
  code,
  "isActive",
  "createdAt",
  (SELECT COUNT(*) FROM "User" WHERE "unitId" = u.id) AS usuarios,
  (SELECT COUNT(*) FROM "Child" WHERE "unitId" = u.id) AS alunos,
  (SELECT COUNT(*) FROM "Classroom" WHERE "unitId" = u.id) AS turmas
FROM "Unit" u
WHERE lower(name) LIKE '%flamboyant%'
   OR code IN ('FLAMBOY', 'FLAMBOYANT')
ORDER BY "createdAt";

\echo ''
\echo '===================================================================='
\echo '2) Usuários vinculados a cada versão do Flamboyant'
\echo '===================================================================='
SELECT
  u2.id AS user_id,
  u2.email,
  u2."firstName",
  u2."lastName",
  u2.status::text,
  un.code AS unidade_code,
  un.name AS unidade_nome,
  r.type::text AS role_type,
  ur."isActive" AS role_ativa
FROM "User" u2
JOIN "Unit" un ON un.id = u2."unitId"
LEFT JOIN "UserRole" ur ON ur."userId" = u2.id
LEFT JOIN "Role" r ON r.id = ur."roleId"
WHERE (lower(un.name) LIKE '%flamboyant%' OR un.code IN ('FLAMBOY', 'FLAMBOYANT'))
ORDER BY un.code, u2.email;

\echo ''
\echo '===================================================================='
\echo '3) Alunos vinculados a cada versão do Flamboyant'
\echo '===================================================================='
SELECT
  un.code AS unidade_code,
  un.name AS unidade_nome,
  COUNT(c.id) AS total_alunos
FROM "Child" c
JOIN "Unit" un ON un.id = c."unitId"
WHERE lower(un.name) LIKE '%flamboyant%'
   OR un.code IN ('FLAMBOY', 'FLAMBOYANT')
GROUP BY un.code, un.name
ORDER BY un.code;


-- ══════════════════════════════════════════════════════════════════════════════
-- PARTE 2 — CORREÇÃO (executar APENAS se o diagnóstico confirmar duplicata)
--
-- Cenário esperado:
--   - FLAMBOY  (seed-units.ts) → pode ter sido criada pelo seed e ter dados
--   - FLAMBOYANT (SQL manual)  → versão correta, usada pelo script V2
--
-- Esta seção migra usuários e alunos de FLAMBOY para FLAMBOYANT,
-- depois desativa a unidade FLAMBOY.
--
-- DESCOMENTE SOMENTE APÓS CONFIRMAR O DIAGNÓSTICO ACIMA.
-- ══════════════════════════════════════════════════════════════════════════════

/*
BEGIN;

DO $$
DECLARE
  v_flamboy_id  TEXT;
  v_flamboyant_id TEXT;
BEGIN
  SELECT id INTO v_flamboy_id    FROM "Unit" WHERE code = 'FLAMBOY'    LIMIT 1;
  SELECT id INTO v_flamboyant_id FROM "Unit" WHERE code = 'FLAMBOYANT' LIMIT 1;

  IF v_flamboy_id IS NULL THEN
    RAISE NOTICE 'Unidade FLAMBOY não encontrada — nenhuma ação necessária.';
    RETURN;
  END IF;

  IF v_flamboyant_id IS NULL THEN
    RAISE EXCEPTION 'Unidade FLAMBOYANT não encontrada. Verifique o banco antes de prosseguir.';
  END IF;

  IF v_flamboy_id = v_flamboyant_id THEN
    RAISE NOTICE 'Mesma unidade — nenhuma ação necessária.';
    RETURN;
  END IF;

  RAISE NOTICE 'Migrando de FLAMBOY (%) para FLAMBOYANT (%)', v_flamboy_id, v_flamboyant_id;

  -- Migrar usuários
  UPDATE "User"
  SET "unitId" = v_flamboyant_id, "updatedAt" = NOW()
  WHERE "unitId" = v_flamboy_id;

  -- Migrar UnitScopes de UserRole
  UPDATE "UserRoleUnitScope"
  SET "unitId" = v_flamboyant_id, "updatedAt" = NOW()
  WHERE "unitId" = v_flamboy_id;

  -- Migrar crianças
  UPDATE "Child"
  SET "unitId" = v_flamboyant_id, "updatedAt" = NOW()
  WHERE "unitId" = v_flamboy_id;

  -- Migrar turmas
  UPDATE "Classroom"
  SET "unitId" = v_flamboyant_id, "updatedAt" = NOW()
  WHERE "unitId" = v_flamboy_id;

  -- Desativar (NÃO deletar) a unidade FLAMBOY
  UPDATE "Unit"
  SET "isActive" = FALSE, "updatedAt" = NOW()
  WHERE id = v_flamboy_id;

  RAISE NOTICE 'Migração concluída. Unidade FLAMBOY desativada.';
END $$;

COMMIT;
*/

-- ══════════════════════════════════════════════════════════════════════════════
-- PARTE 3 — VERIFICAÇÃO PÓS-CORREÇÃO
-- ══════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '===================================================================='
\echo '4) Verificação final: usuários e alunos por unidade Flamboyant'
\echo '===================================================================='
SELECT
  un.code,
  un.name,
  un."isActive",
  COUNT(DISTINCT u.id) AS usuarios,
  COUNT(DISTINCT c.id) AS alunos
FROM "Unit" un
LEFT JOIN "User" u ON u."unitId" = un.id
LEFT JOIN "Child" c ON c."unitId" = un.id
WHERE lower(un.name) LIKE '%flamboyant%'
   OR un.code IN ('FLAMBOY', 'FLAMBOYANT')
GROUP BY un.code, un.name, un."isActive"
ORDER BY un.code;
