
-- CONEXA - Correção segura de acessos operacionais por unidade
-- ATENÇÃO: executar somente depois de backup pg_dump.
--
-- Escopo:
-- 1) Corrige/cria logins administrativos reais da CEPI Arara Canindé.
-- 2) Mantém professores existentes da Arara.
-- 3) Bloqueia acesso de monitores/auxiliares e profissionais não operacionais da Flamboyant.
-- 4) Mantém ativos apenas: professor, coordenação, nutrição, direção e secretaria/administrativo real.
-- 5) Não altera alunos, matrículas, turmas, diário, planejamento, histórico ou dados pedagógicos.
--
-- Backup recomendado:
-- docker exec -t w12b7gmnfug9fdi7kxdabrge pg_dump -U postgres -d postgres > backup_conexa_antes_correcao_acessos_$(date +%Y%m%d_%H%M%S).sql

BEGIN;

DO $$
DECLARE
  v_mantenedora_id TEXT;
  v_arara_unit_id TEXT;
  v_flamboyant_unit_id TEXT;
  v_pelicano_unit_id TEXT;

  v_role_diretor TEXT;
  v_role_coord TEXT;
  v_role_nutri TEXT;
  v_role_admin TEXT;
  v_role_prof TEXT;

  v_hash TEXT;
  v_user_id TEXT;

  PROCEDURE ensure_user_role(
    p_user_id TEXT,
    p_role_id TEXT,
    p_scope "RoleLevel",
    p_role_key TEXT
  )
  LANGUAGE plpgsql
  AS $proc$
  BEGIN
    UPDATE "UserRole"
    SET "isActive" = FALSE, "updatedAt" = NOW()
    WHERE "userId" = p_user_id
      AND "roleId" <> p_role_id;

    INSERT INTO "UserRole" (id, "userId", "roleId", "scopeLevel", "isActive", "createdAt", "updatedAt")
    VALUES (
      'fix_role_' || regexp_replace(p_user_id || '_' || p_role_key, '[^a-zA-Z0-9_]+', '_', 'g'),
      p_user_id,
      p_role_id,
      p_scope,
      TRUE,
      NOW(),
      NOW()
    )
    ON CONFLICT ("userId", "roleId")
    DO UPDATE SET
      "scopeLevel" = EXCLUDED."scopeLevel",
      "isActive" = TRUE,
      "updatedAt" = NOW();
  END;
  $proc$;

  PROCEDURE upsert_operational_user(
    p_old_email TEXT,
    p_new_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_phone TEXT,
    p_unit_id TEXT,
    p_role_id TEXT,
    p_scope "RoleLevel",
    p_role_key TEXT
  )
  LANGUAGE plpgsql
  AS $proc$
  DECLARE
    v_existing_old TEXT;
    v_existing_new TEXT;
    v_final_user TEXT;
  BEGIN
    SELECT id INTO v_existing_old
    FROM "User"
    WHERE lower(email) = lower(p_old_email)
    LIMIT 1;

    SELECT id INTO v_existing_new
    FROM "User"
    WHERE lower(email) = lower(p_new_email)
    LIMIT 1;

    IF v_existing_new IS NOT NULL THEN
      v_final_user := v_existing_new;

      UPDATE "User"
      SET
        "firstName" = p_first_name,
        "lastName" = p_last_name,
        phone = p_phone,
        "unitId" = p_unit_id,
        "mantenedoraId" = v_mantenedora_id,
        status = 'ATIVO'::"UserStatus",
        "emailVerified" = TRUE,
        password = COALESCE(NULLIF(password, ''), v_hash),
        "updatedAt" = NOW()
      WHERE id = v_final_user;

      IF v_existing_old IS NOT NULL AND v_existing_old <> v_existing_new THEN
        UPDATE "User"
        SET status = 'INATIVO'::"UserStatus", "updatedAt" = NOW()
        WHERE id = v_existing_old;

        UPDATE "UserRole"
        SET "isActive" = FALSE, "updatedAt" = NOW()
        WHERE "userId" = v_existing_old;
      END IF;

    ELSIF v_existing_old IS NOT NULL THEN
      v_final_user := v_existing_old;

      UPDATE "User"
      SET
        email = lower(p_new_email),
        "firstName" = p_first_name,
        "lastName" = p_last_name,
        phone = p_phone,
        "unitId" = p_unit_id,
        "mantenedoraId" = v_mantenedora_id,
        status = 'ATIVO'::"UserStatus",
        "emailVerified" = TRUE,
        password = COALESCE(NULLIF(password, ''), v_hash),
        "updatedAt" = NOW()
      WHERE id = v_final_user;

    ELSE
      v_final_user := 'fix_user_' || regexp_replace(lower(p_new_email), '[^a-z0-9]+', '_', 'g');

      INSERT INTO "User" (
        id, "mantenedoraId", "unitId", email, password,
        "firstName", "lastName", phone, status, "emailVerified",
        "createdAt", "updatedAt"
      )
      VALUES (
        v_final_user, v_mantenedora_id, p_unit_id, lower(p_new_email), v_hash,
        p_first_name, p_last_name, p_phone, 'ATIVO'::"UserStatus", TRUE,
        NOW(), NOW()
      )
      ON CONFLICT (email)
      DO UPDATE SET
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        phone = EXCLUDED.phone,
        "unitId" = EXCLUDED."unitId",
        "mantenedoraId" = EXCLUDED."mantenedoraId",
        status = 'ATIVO'::"UserStatus",
        "emailVerified" = TRUE,
        password = COALESCE(NULLIF("User".password, ''), EXCLUDED.password),
        "updatedAt" = NOW();

      SELECT id INTO v_final_user
      FROM "User"
      WHERE lower(email) = lower(p_new_email)
      LIMIT 1;
    END IF;

    CALL ensure_user_role(v_final_user, p_role_id, p_scope, p_role_key);
  END;
  $proc$;

BEGIN
  SELECT id INTO v_mantenedora_id
  FROM "Mantenedora"
  WHERE "isActive" = TRUE
  ORDER BY "createdAt"
  LIMIT 1;

  SELECT id INTO v_arara_unit_id FROM "Unit" WHERE code = 'ARARA-CANINDE' LIMIT 1;
  SELECT id INTO v_flamboyant_unit_id FROM "Unit" WHERE code = 'FLAMBOYANT' LIMIT 1;
  SELECT id INTO v_pelicano_unit_id FROM "Unit" WHERE code = 'PELICANO' LIMIT 1;

  SELECT id INTO v_role_diretor FROM "Role" WHERE type::text = 'UNIDADE_DIRETOR' AND "mantenedoraId" = v_mantenedora_id LIMIT 1;
  SELECT id INTO v_role_coord   FROM "Role" WHERE type::text = 'UNIDADE_COORDENADOR_PEDAGOGICO' AND "mantenedoraId" = v_mantenedora_id LIMIT 1;
  SELECT id INTO v_role_nutri   FROM "Role" WHERE type::text = 'UNIDADE_NUTRICIONISTA' AND "mantenedoraId" = v_mantenedora_id LIMIT 1;
  SELECT id INTO v_role_admin   FROM "Role" WHERE type::text = 'UNIDADE_ADMINISTRATIVO' AND "mantenedoraId" = v_mantenedora_id LIMIT 1;
  SELECT id INTO v_role_prof    FROM "Role" WHERE type::text = 'PROFESSOR' AND "mantenedoraId" = v_mantenedora_id LIMIT 1;

  SELECT password INTO v_hash
  FROM "User"
  WHERE lower(email) IN (
    'professor@testepiloto.com.br',
    'diretor@arara.com',
    'coordenador@cepi.com.br',
    'nutri@arara.com'
  )
    AND password IS NOT NULL
    AND length(password) > 20
  ORDER BY CASE WHEN lower(email) = 'professor@testepiloto.com.br' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_mantenedora_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma mantenedora ativa encontrada.';
  END IF;

  IF v_arara_unit_id IS NULL THEN
    RAISE EXCEPTION 'Unidade ARARA-CANINDE não encontrada.';
  END IF;

  IF v_hash IS NULL THEN
    RAISE EXCEPTION 'Não foi encontrado hash de senha válido para usar como senha operacional.';
  END IF;

  IF v_role_diretor IS NULL OR v_role_coord IS NULL OR v_role_nutri IS NULL OR v_role_admin IS NULL OR v_role_prof IS NULL THEN
    RAISE EXCEPTION 'Uma ou mais roles operacionais não foram encontradas.';
  END IF;

  -- 1) Corrigir/atualizar administrativos reais da Arara Canindé.
  -- Preserva IDs antigos quando atualiza emails antigos para os emails reais.
  CALL upsert_operational_user(
    'diretor@arara.com',
    'ddacruz385@gmail.com',
    'DANIEL',
    'PEREIRA DA CRUZ',
    '61984943787',
    v_arara_unit_id,
    v_role_diretor,
    'UNIDADE'::"RoleLevel",
    'diretor_arara'
  );

  CALL upsert_operational_user(
    'coordenador@cepi.com.br',
    'coordenadoracaarol@gmail.com',
    'ANA CAROLINA',
    'DE ARAUJO',
    '61992970192',
    v_arara_unit_id,
    v_role_coord,
    'UNIDADE'::"RoleLevel",
    'coord_arara'
  );

  CALL upsert_operational_user(
    'nutri@arara.com',
    'ds.viana@yahoo.com.br',
    'DORLI',
    'SOUZA VIANA',
    '61996301572',
    v_arara_unit_id,
    v_role_nutri,
    'UNIDADE'::"RoleLevel",
    'nutri_arara'
  );

  CALL upsert_operational_user(
    'adriel-souza11@hotmail.com',
    'adriel-souza11@hotmail.com',
    'ADRIEL ALLAN',
    'LOURENÇO DE SOUZA',
    '61992916112',
    v_arara_unit_id,
    v_role_admin,
    'UNIDADE'::"RoleLevel",
    'secretaria_arara'
  );

  -- 2) Garantir que operacionais corretos da Pelicano e Flamboyant estejam ativos.
  UPDATE "User"
  SET status = 'ATIVO'::"UserStatus",
      "emailVerified" = TRUE,
      password = COALESCE(NULLIF(password, ''), v_hash),
      "updatedAt" = NOW()
  WHERE lower(email) IN (
    -- Pelicano
    'suladiretora2025@gmail.com',
    'coordenacaopelicano@gmail.com',
    'profnascimento36@gmail.com',
    'nutricassiafernandes@gmail.com',
    'israelrodriface@gmail.com',
    'talitasaracalebe@gmail.com',
    -- Flamboyant
    'adriananarciso.ve@gmail.com',
    'sontosclea@hotmail.com',
    'gomescarolina.marques@gmail.com',
    'gessica_gcp@hotmail.com',
    'vanderlon.tavares@cocris.org'
  );

  -- 3) Flamboyant: bloquear acesso de monitores, cozinha, limpeza, porteiro, patrimonial, aprendiz e apoio não operacional.
  -- Não exclui usuário. Apenas deixa INATIVO e desativa UserRole.
  UPDATE "User"
  SET status = 'INATIVO'::"UserStatus", "updatedAt" = NOW()
  WHERE "unitId" = v_flamboyant_unit_id
    AND lower(email) IN (
      -- Monitores / auxiliares sem acesso ao sistema
      'anakarolynetomaz@gmail.com',
      'adarleide09@gmail.com',
      'fernandaanabia@gmail.com',
      'isadoraoliveirarodrigues531@gmail.com',
      'gamajaine@gmail.com',
      'jessicalima07mix@gmail.com',
      'thamitj1@gmail.com',
      'lindakaka39@gmail.com',
      'contatolidiav@gmail.com',
      'maisaf2019@gmail.com',
      'fatimagt10@hotmail.com',
      'marlenedejesussantos31@gmail.com',
      'si_gorreia@hotmail.com',
      'tomazthaina4@gmail.com',
      'thalyaalvesmachado@gmail.com',
      'vivimorais3003@gmail.com',

      -- Administrativos indevidos importados do seed como acesso, mas não são secretaria operacional
      'anapaulajr367@gmail.com',
      'cleidilenerodrigues7401@gmail.com',
      'danielasousa201521@gmail.com',
      'elizangelatorres15@hotmail.com',
      'ev263025@gmail.com',
      'ggmelandia2009@gmail.com',
      'jl.lucianoalmeida@gmail.com',
      'josericardopaulino497@gmail.com',
      'marinacarneiro750@gmail.com',
      'te84226180@gmail.com',
      'calixto_vicyu@outlook.com',
      'wilascandidabarbosa@gmail.com'
    );

  UPDATE "UserRole"
  SET "isActive" = FALSE, "updatedAt" = NOW()
  WHERE "userId" IN (
    SELECT id
    FROM "User"
    WHERE "unitId" = v_flamboyant_unit_id
      AND status = 'INATIVO'::"UserStatus"
      AND lower(email) IN (
        'anakarolynetomaz@gmail.com',
        'adarleide09@gmail.com',
        'fernandaanabia@gmail.com',
        'isadoraoliveirarodrigues531@gmail.com',
        'gamajaine@gmail.com',
        'jessicalima07mix@gmail.com',
        'thamitj1@gmail.com',
        'lindakaka39@gmail.com',
        'contatolidiav@gmail.com',
        'maisaf2019@gmail.com',
        'fatimagt10@hotmail.com',
        'marlenedejesussantos31@gmail.com',
        'si_gorreia@hotmail.com',
        'tomazthaina4@gmail.com',
        'thalyaalvesmachado@gmail.com',
        'vivimorais3003@gmail.com',
        'anapaulajr367@gmail.com',
        'cleidilenerodrigues7401@gmail.com',
        'danielasousa201521@gmail.com',
        'elizangelatorres15@hotmail.com',
        'ev263025@gmail.com',
        'ggmelandia2009@gmail.com',
        'jl.lucianoalmeida@gmail.com',
        'josericardopaulino497@gmail.com',
        'marinacarneiro750@gmail.com',
        'te84226180@gmail.com',
        'calixto_vicyu@outlook.com',
        'wilascandidabarbosa@gmail.com'
      )
  );

  -- 4) Garantir que professores oficiais da Flamboyant continuem ativos.
  UPDATE "User"
  SET status = 'ATIVO'::"UserStatus",
      "emailVerified" = TRUE,
      password = COALESCE(NULLIF(password, ''), v_hash),
      "updatedAt" = NOW()
  WHERE "unitId" = v_flamboyant_unit_id
    AND lower(email) IN (
      'cryscunhasilva@gmail.com',
      'edinaleite8556@gmail.com',
      'elaynne87@gmail.com',
      'geisacap30@gmail.com',
      'lilia_santosaraujo@hotmail.com',
      'meirocaabreu34@gmail.com',
      'sisiflamenguista@hotmail.com',
      'stephaniepassos680@gmail.com',
      'suelyvieira85@gmail.com'
    );

  RAISE NOTICE 'Correção de acessos concluída: Arara real administrativo criado/atualizado; Flamboyant não operacional bloqueado; alunos e matrículas não foram alterados.';
END $$;

COMMIT;

-- Conferência rápida pós-correção
SELECT
  un.name AS unidade,
  un.code AS codigo_unidade,
  u.email,
  u."firstName",
  u."lastName",
  u.phone,
  u.status::text AS status,
  r.name AS perfil,
  r.type::text AS role_type,
  ur."isActive" AS role_ativa
FROM "User" u
JOIN "Unit" un ON un.id = u."unitId"
LEFT JOIN "UserRole" ur ON ur."userId" = u.id
LEFT JOIN "Role" r ON r.id = ur."roleId"
WHERE un.code IN ('ARARA-CANINDE','FLAMBOYANT','PELICANO')
ORDER BY un.code, u.status::text, r.type::text, u.email;
