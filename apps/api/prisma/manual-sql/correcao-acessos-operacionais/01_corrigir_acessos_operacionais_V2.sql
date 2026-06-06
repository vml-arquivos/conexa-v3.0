-- CONEXA - Correção segura de acessos operacionais por unidade - V2
-- V2 corrige erro da versão anterior: remove PROCEDURE interna dentro de DO $$.
-- Executar somente depois de backup pg_dump.
-- Não altera alunos, matrículas, turmas, diário, planejamento, histórico ou dados pedagógicos.

BEGIN;

DO $$
DECLARE
  v_mantenedora_id TEXT;
  v_arara_unit_id TEXT;
  v_flamboyant_unit_id TEXT;
  v_role_diretor TEXT;
  v_role_coord TEXT;
  v_role_nutri TEXT;
  v_role_admin TEXT;
  v_role_prof TEXT;
  v_hash TEXT;
  v_old_id TEXT;
  v_new_id TEXT;
  v_final_user_id TEXT;
  v_has_inativo BOOLEAN;
  rec RECORD;
BEGIN
  SELECT id INTO v_mantenedora_id
  FROM "Mantenedora"
  WHERE "isActive" = TRUE
  ORDER BY "createdAt"
  LIMIT 1;

  SELECT id INTO v_arara_unit_id FROM "Unit" WHERE code = 'ARARA-CANINDE' LIMIT 1;
  SELECT id INTO v_flamboyant_unit_id FROM "Unit" WHERE code = 'FLAMBOYANT' LIMIT 1;

  SELECT id INTO v_role_diretor FROM "Role" WHERE type::text = 'UNIDADE_DIRETOR' AND "mantenedoraId" = v_mantenedora_id LIMIT 1;
  SELECT id INTO v_role_coord   FROM "Role" WHERE type::text = 'UNIDADE_COORDENADOR_PEDAGOGICO' AND "mantenedoraId" = v_mantenedora_id LIMIT 1;
  SELECT id INTO v_role_nutri   FROM "Role" WHERE type::text = 'UNIDADE_NUTRICIONISTA' AND "mantenedoraId" = v_mantenedora_id LIMIT 1;
  SELECT id INTO v_role_admin   FROM "Role" WHERE type::text = 'UNIDADE_ADMINISTRATIVO' AND "mantenedoraId" = v_mantenedora_id LIMIT 1;
  SELECT id INTO v_role_prof    FROM "Role" WHERE type::text = 'PROFESSOR' AND "mantenedoraId" = v_mantenedora_id LIMIT 1;

  SELECT password INTO v_hash
  FROM "User"
  WHERE lower(email) IN ('professor@testepiloto.com.br','diretor@arara.com','coordenador@cepi.com.br','nutri@arara.com')
    AND password IS NOT NULL
    AND length(password) > 20
  ORDER BY CASE WHEN lower(email) = 'professor@testepiloto.com.br' THEN 0 ELSE 1 END
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UserStatus'
      AND e.enumlabel = 'INATIVO'
  ) INTO v_has_inativo;

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
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('diretor@arara.com', 'ddacruz385@gmail.com', 'DANIEL', 'PEREIRA DA CRUZ', '61984943787', v_role_diretor, 'UNIDADE_DIRETOR'),
        ('coordenador@cepi.com.br', 'coordenadoracaarol@gmail.com', 'ANA CAROLINA', 'DE ARAUJO', '61992970192', v_role_coord, 'UNIDADE_COORDENADOR_PEDAGOGICO'),
        ('nutri@arara.com', 'ds.viana@yahoo.com.br', 'DORLI', 'SOUZA VIANA', '61996301572', v_role_nutri, 'UNIDADE_NUTRICIONISTA'),
        ('adriel-souza11@hotmail.com', 'adriel-souza11@hotmail.com', 'ADRIEL ALLAN', 'LOURENÇO DE SOUZA', '61992916112', v_role_admin, 'UNIDADE_ADMINISTRATIVO')
    ) AS x(old_email, new_email, first_name, last_name, phone, role_id, role_key)
  LOOP
    v_old_id := NULL;
    v_new_id := NULL;
    v_final_user_id := NULL;

    SELECT id INTO v_old_id FROM "User" WHERE lower(email) = lower(rec.old_email) LIMIT 1;
    SELECT id INTO v_new_id FROM "User" WHERE lower(email) = lower(rec.new_email) LIMIT 1;

    IF v_new_id IS NOT NULL THEN
      v_final_user_id := v_new_id;

      UPDATE "User"
      SET "firstName" = rec.first_name,
          "lastName" = rec.last_name,
          phone = rec.phone,
          "unitId" = v_arara_unit_id,
          "mantenedoraId" = v_mantenedora_id,
          status = 'ATIVO'::"UserStatus",
          "emailVerified" = TRUE,
          password = COALESCE(NULLIF(password, ''), v_hash),
          "updatedAt" = NOW()
      WHERE id = v_final_user_id;

      IF v_old_id IS NOT NULL AND v_old_id <> v_new_id THEN
        IF v_has_inativo THEN
          UPDATE "User" SET status = 'INATIVO'::"UserStatus", "updatedAt" = NOW()
          WHERE id = v_old_id;
        END IF;

        UPDATE "UserRole" SET "isActive" = FALSE, "updatedAt" = NOW()
        WHERE "userId" = v_old_id;
      END IF;

    ELSIF v_old_id IS NOT NULL THEN
      v_final_user_id := v_old_id;

      UPDATE "User"
      SET email = lower(rec.new_email),
          "firstName" = rec.first_name,
          "lastName" = rec.last_name,
          phone = rec.phone,
          "unitId" = v_arara_unit_id,
          "mantenedoraId" = v_mantenedora_id,
          status = 'ATIVO'::"UserStatus",
          "emailVerified" = TRUE,
          password = COALESCE(NULLIF(password, ''), v_hash),
          "updatedAt" = NOW()
      WHERE id = v_final_user_id;

    ELSE
      v_final_user_id := 'fix_user_' || regexp_replace(lower(rec.new_email), '[^a-z0-9]+', '_', 'g');

      INSERT INTO "User" (
        id, "mantenedoraId", "unitId", email, password,
        "firstName", "lastName", phone, status, "emailVerified",
        "createdAt", "updatedAt"
      )
      VALUES (
        v_final_user_id, v_mantenedora_id, v_arara_unit_id, lower(rec.new_email), v_hash,
        rec.first_name, rec.last_name, rec.phone, 'ATIVO'::"UserStatus", TRUE,
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

      SELECT id INTO v_final_user_id FROM "User" WHERE lower(email) = lower(rec.new_email) LIMIT 1;
    END IF;

    -- Manter apenas a role correta para esse usuário operacional.
    UPDATE "UserRole"
    SET "isActive" = FALSE, "updatedAt" = NOW()
    WHERE "userId" = v_final_user_id
      AND "roleId" <> rec.role_id;

    INSERT INTO "UserRole" (id, "userId", "roleId", "scopeLevel", "isActive", "createdAt", "updatedAt")
    VALUES (
      'fix_role_' || regexp_replace(v_final_user_id || '_' || rec.role_key, '[^a-zA-Z0-9_]+', '_', 'g'),
      v_final_user_id,
      rec.role_id,
      'UNIDADE'::"RoleLevel",
      TRUE,
      NOW(),
      NOW()
    )
    ON CONFLICT ("userId", "roleId")
    DO UPDATE SET
      "scopeLevel" = EXCLUDED."scopeLevel",
      "isActive" = TRUE,
      "updatedAt" = NOW();
  END LOOP;

  -- 2) Garantir Pelicano e Flamboyant operacionais principais ativos.
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

  -- 3) Flamboyant: bloquear acesso de monitores/auxiliares.
  IF v_flamboyant_unit_id IS NOT NULL THEN
    IF v_has_inativo THEN
      UPDATE "User"
      SET status = 'INATIVO'::"UserStatus",
          "updatedAt" = NOW()
      WHERE "unitId" = v_flamboyant_unit_id
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
          'vivimorais3003@gmail.com'
        );
    END IF;

    UPDATE "UserRole"
    SET "isActive" = FALSE, "updatedAt" = NOW()
    WHERE "userId" IN (
      SELECT id
      FROM "User"
      WHERE "unitId" = v_flamboyant_unit_id
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
          'vivimorais3003@gmail.com'
        )
    );

    -- 4) Flamboyant: deixa ativos apenas operacionais permitidos.
    IF v_has_inativo THEN
      UPDATE "User"
      SET status = 'INATIVO'::"UserStatus",
          "updatedAt" = NOW()
      WHERE "unitId" = v_flamboyant_unit_id
        AND lower(email) NOT IN (
          -- direção, coordenação, nutrição
          'adriananarciso.ve@gmail.com',
          'sontosclea@hotmail.com',
          'gomescarolina.marques@gmail.com',
          -- secretaria operacional
          'gessica_gcp@hotmail.com',
          'vanderlon.tavares@cocris.org',
          -- professoras oficiais
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
    END IF;

    UPDATE "UserRole"
    SET "isActive" = FALSE, "updatedAt" = NOW()
    WHERE "userId" IN (
      SELECT id
      FROM "User"
      WHERE "unitId" = v_flamboyant_unit_id
        AND lower(email) NOT IN (
          'adriananarciso.ve@gmail.com',
          'sontosclea@hotmail.com',
          'gomescarolina.marques@gmail.com',
          'gessica_gcp@hotmail.com',
          'vanderlon.tavares@cocris.org',
          'cryscunhasilva@gmail.com',
          'edinaleite8556@gmail.com',
          'elaynne87@gmail.com',
          'geisacap30@gmail.com',
          'lilia_santosaraujo@hotmail.com',
          'meirocaabreu34@gmail.com',
          'sisiflamenguista@hotmail.com',
          'stephaniepassos680@gmail.com',
          'suelyvieira85@gmail.com'
        )
    );

    UPDATE "User"
    SET status = 'ATIVO'::"UserStatus",
        "emailVerified" = TRUE,
        password = COALESCE(NULLIF(password, ''), v_hash),
        "updatedAt" = NOW()
    WHERE "unitId" = v_flamboyant_unit_id
      AND lower(email) IN (
        'adriananarciso.ve@gmail.com',
        'sontosclea@hotmail.com',
        'gomescarolina.marques@gmail.com',
        'gessica_gcp@hotmail.com',
        'vanderlon.tavares@cocris.org',
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

    UPDATE "UserRole"
    SET "isActive" = TRUE, "updatedAt" = NOW()
    WHERE "userId" IN (
      SELECT id
      FROM "User"
      WHERE "unitId" = v_flamboyant_unit_id
        AND lower(email) IN (
          'adriananarciso.ve@gmail.com',
          'sontosclea@hotmail.com',
          'gomescarolina.marques@gmail.com',
          'gessica_gcp@hotmail.com',
          'vanderlon.tavares@cocris.org',
          'cryscunhasilva@gmail.com',
          'edinaleite8556@gmail.com',
          'elaynne87@gmail.com',
          'geisacap30@gmail.com',
          'lilia_santosaraujo@hotmail.com',
          'meirocaabreu34@gmail.com',
          'sisiflamenguista@hotmail.com',
          'stephaniepassos680@gmail.com',
          'suelyvieira85@gmail.com'
        )
    );
  END IF;

  RAISE NOTICE 'Correção V2 concluída. Alunos, matrículas, turmas e históricos não foram alterados.';
END $$;

COMMIT;
