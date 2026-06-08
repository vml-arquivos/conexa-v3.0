\pset pager off
\timing on

\echo '============================================================'
\echo 'AUTO DEPLOY - Correção idempotente de acessos operacionais'
\echo '============================================================'

BEGIN;

CREATE TEMP TABLE _deploy_access_expected (
  email TEXT PRIMARY KEY,
  role_type TEXT NOT NULL,
  unit_key TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO _deploy_access_expected (email, role_type, unit_key) VALUES
  ('adriananarciso.ve@gmail.com','UNIDADE_DIRETOR','FLAMBOYANT'),
  ('sontosclea@hotmail.com','UNIDADE_COORDENADOR_PEDAGOGICO','FLAMBOYANT'),
  ('gomescarolina.marques@gmail.com','UNIDADE_NUTRICIONISTA','FLAMBOYANT'),
  ('gessica_gcp@hotmail.com','UNIDADE_ADMINISTRATIVO','FLAMBOYANT'),
  ('vanderlon.tavares@cocris.org','UNIDADE_ADMINISTRATIVO','FLAMBOYANT'),
  ('cryscunhasilva@gmail.com','PROFESSOR','FLAMBOYANT'),
  ('edinaleite8556@gmail.com','PROFESSOR','FLAMBOYANT'),
  ('elaynne87@gmail.com','PROFESSOR','FLAMBOYANT'),
  ('geisacap30@gmail.com','PROFESSOR','FLAMBOYANT'),
  ('lilia_santosaraujo@hotmail.com','PROFESSOR','FLAMBOYANT'),
  ('meirocaabreu34@gmail.com','PROFESSOR','FLAMBOYANT'),
  ('sisiflamenguista@hotmail.com','PROFESSOR','FLAMBOYANT'),
  ('stephaniepassos680@gmail.com','PROFESSOR','FLAMBOYANT'),
  ('suelyvieira85@gmail.com','PROFESSOR','FLAMBOYANT'),
  ('ppasantana@gmail.com','UNIDADE_DIRETOR','SABIA'),
  ('fatinha.cord21@gmail.com','UNIDADE_COORDENADOR_PEDAGOGICO','SABIA'),
  ('flavia.raphaely@hotmail.com','UNIDADE_ADMINISTRATIVO','SABIA'),
  ('brunapires.nutri@gmail.com','UNIDADE_NUTRICIONISTA','SABIA'),
  ('amandhacardoso1994@gmail.com','PROFESSOR','SABIA'),
  ('carlacristina378@gmail.com','PROFESSOR','SABIA'),
  ('catiapessoa0530@gmail.com','PROFESSOR','SABIA'),
  ('ds411698@gmail.com','PROFESSOR','SABIA'),
  ('elenicebispo.563@gmail.com','PROFESSOR','SABIA'),
  ('mariajucelia1980@gmail.com','PROFESSOR','SABIA'),
  ('marlenemkm@gmail.com','PROFESSOR','SABIA'),
  ('rosamarinho229@gmail.com','PROFESSOR','SABIA'),
  ('tatilamichele88@gmail.com','PROFESSOR','SABIA'),
  ('ddacruz385@gmail.com','UNIDADE_DIRETOR','ARARA'),
  ('coordenadoracaarol@gmail.com','UNIDADE_COORDENADOR_PEDAGOGICO','ARARA'),
  ('ds.viana@yahoo.com.br','UNIDADE_NUTRICIONISTA','ARARA'),
  ('adriel-souza11@hotmail.com','UNIDADE_ADMINISTRATIVO','ARARA'),
  ('suladiretora2025@gmail.com','UNIDADE_DIRETOR','PELICANO'),
  ('coordenacaopelicano@gmail.com','UNIDADE_COORDENADOR_PEDAGOGICO','PELICANO'),
  ('profnascimento36@gmail.com','UNIDADE_COORDENADOR_PEDAGOGICO','PELICANO'),
  ('israelrodriface@gmail.com','UNIDADE_ADMINISTRATIVO','PELICANO'),
  ('talitasaracalebe@gmail.com','UNIDADE_ADMINISTRATIVO','PELICANO'),
  ('nutricassiafernandes@gmail.com','UNIDADE_NUTRICIONISTA','PELICANO'),
  ('profadacristina@gmail.com','PROFESSOR','PELICANO'),
  ('profadrianacarlas2025@gmail.com','PROFESSOR','PELICANO'),
  ('apollianamaria@gmail.com','PROFESSOR','PELICANO'),
  ('pelicanoclaudia2025@gmail.com','PROFESSOR','PELICANO'),
  ('clicianeprof2026@gmail.com','PROFESSOR','PELICANO'),
  ('daniprof2026@gmail.com','PROFESSOR','PELICANO'),
  ('professoraelza36@gmail.com','PROFESSOR','PELICANO'),
  ('proffrancispelicano@gmail.com','PROFESSOR','PELICANO'),
  ('pedagogamariacida@gmail.com','PROFESSOR','PELICANO'),
  ('professoramiriam8@gmail.com','PROFESSOR','PELICANO'),
  ('pri.professora2025@gmail.com','PROFESSOR','PELICANO'),
  ('professorasabrinaolive2025@gmail.com','PROFESSOR','PELICANO'),
  ('saletepires1204@gmail.com','PROFESSOR','PELICANO'),
  ('shirlene.professora2025@gmail.com','PROFESSOR','PELICANO'),
  ('professorasilvia56@gmail.com','PROFESSOR','PELICANO'),
  ('fernandaprof@gmail.com','PROFESSOR','PELICANO');

CREATE TEMP TABLE _deploy_no_access_email (email TEXT PRIMARY KEY) ON COMMIT DROP;

INSERT INTO _deploy_no_access_email (email) VALUES
  ('anakarolynetomaz@gmail.com'),('adarleide09@gmail.com'),('fernandaanabia@gmail.com'),
  ('isadoraoliveirarodrigues531@gmail.com'),('gamajaine@gmail.com'),('jessicalima07mix@gmail.com'),
  ('thamitj1@gmail.com'),('lindakaka39@gmail.com'),('contatolidiav@gmail.com'),
  ('maisaf2019@gmail.com'),('fatimagt10@hotmail.com'),('marlenedejesussantos31@gmail.com'),
  ('si_gorreia@hotmail.com'),('tomazthaina4@gmail.com'),('thalyaalvesmachado@gmail.com'),
  ('vivimorais3003@gmail.com'),('naninhadf2012@gmail.com'),('fernandab.silva1606@gmail.com'),
  ('giiooaraujoomend@gmail.com'),('graacy.dutra@gmail.com'),('jayaneyasmim822@gmail.com'),
  ('jessicafbastos@hotmail.com'),('darckrocha@gmail.com'),('joyceudgg77284@gmail.com'),
  ('kauannysthefany75@gmail.com'),('mariaexp157842@gmail.com'),('mara08_@hotmail.com'),
  ('milena_1ribeiro@icloud.com'),('patricia.tgb.pb@gmail.com'),('rayane.raypereira@gmail.com'),
  ('sheronferreira14@gmail.com'),('yslane.galeno@gmail.com'),('riksondutra@gmail.com');

CREATE TEMP TABLE _deploy_unit_candidates AS
WITH explicit_candidates(unit_key, unit_id, priority) AS (
  VALUES
    ('FLAMBOYANT','seed_unit_flamboyant',1),
    ('FLAMBOYANT','cmmbhsz23000bmemp6u11ocds',2),
    ('SABIA','cmmbhsz1o0005mempvrlz3n0g',1),
    ('ARARA','unit-arara-caninde',1),
    ('PELICANO','cmmbhsz1y0009mempaeb9uqm9',1)
), named_candidates AS (
  SELECT 'FLAMBOYANT'::TEXT AS unit_key, u.id AS unit_id, 50 AS priority
  FROM "Unit" u
  WHERE u.code ILIKE '%FLAMBOYANT%' OR u.name ILIKE '%FLAMBOYANT%'
  UNION ALL
  SELECT 'SABIA'::TEXT, u.id, 50
  FROM "Unit" u
  WHERE u.code ILIKE '%SABIA%' OR u.name ILIKE '%SABIÁ%' OR u.name ILIKE '%SABIA%'
  UNION ALL
  SELECT 'ARARA'::TEXT, u.id, 50
  FROM "Unit" u
  WHERE u.code ILIKE '%ARARA%' OR u.name ILIKE '%ARARA%'
  UNION ALL
  SELECT 'PELICANO'::TEXT, u.id, 50
  FROM "Unit" u
  WHERE u.code ILIKE '%PELICANO%' OR u.name ILIKE '%PELICANO%'
), all_candidates AS (
  SELECT * FROM explicit_candidates
  UNION ALL
  SELECT * FROM named_candidates
)
SELECT DISTINCT unit_key, unit_id, MIN(priority) AS priority
FROM all_candidates
GROUP BY unit_key, unit_id;

CREATE TEMP TABLE _deploy_resolved_units AS
WITH scored AS (
  SELECT
    c.unit_key,
    u.id AS unit_id,
    u.name,
    u.code,
    u."mantenedoraId",
    c.priority,
    COALESCE(child_counts.children_count, 0) AS children_count,
    COALESCE(class_counts.classroom_count, 0) AS classroom_count,
    COALESCE(enrollment_counts.active_enrollment_count, 0) AS active_enrollment_count,
    (
      COALESCE(child_counts.children_count, 0)
      + COALESCE(class_counts.classroom_count, 0) * 10
      + COALESCE(enrollment_counts.active_enrollment_count, 0)
    ) AS pedagogical_score
  FROM _deploy_unit_candidates c
  JOIN "Unit" u ON u.id = c.unit_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT AS children_count
    FROM "Child" ch
    WHERE ch."unitId" = u.id
  ) child_counts ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT AS classroom_count
    FROM "Classroom" cl
    WHERE cl."unitId" = u.id
  ) class_counts ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT AS active_enrollment_count
    FROM "Enrollment" en
    JOIN "Child" ch ON ch.id = en."childId"
    WHERE ch."unitId" = u.id
      AND en.status::TEXT = 'ATIVA'
  ) enrollment_counts ON TRUE
)
SELECT DISTINCT ON (unit_key)
  unit_key,
  unit_id,
  name,
  code,
  "mantenedoraId",
  children_count,
  classroom_count,
  active_enrollment_count,
  pedagogical_score
FROM scored
ORDER BY unit_key, pedagogical_score DESC, priority ASC, unit_id ASC;

DO $$
DECLARE
  v_missing_units TEXT;
BEGIN
  SELECT STRING_AGG(k.unit_key, ', ' ORDER BY k.unit_key)
  INTO v_missing_units
  FROM (VALUES ('FLAMBOYANT'), ('SABIA'), ('ARARA'), ('PELICANO')) AS k(unit_key)
  LEFT JOIN _deploy_resolved_units ru ON ru.unit_key = k.unit_key
  WHERE ru.unit_id IS NULL;

  IF v_missing_units IS NOT NULL THEN
    RAISE EXCEPTION 'AUTO DEPLOY ACESSOS: unidades não resolvidas: %', v_missing_units;
  END IF;
END $$;

\echo 'Unidades resolvidas para o deploy:'
TABLE _deploy_resolved_units;

\echo '1/6 - Atualizando usuários existentes da matriz oficial...'
UPDATE "User" u
SET
  "unitId" = ru.unit_id,
  "mantenedoraId" = ru."mantenedoraId",
  status = 'ATIVO'::"UserStatus",
  "emailVerified" = TRUE,
  "updatedAt" = NOW()
FROM _deploy_access_expected e
JOIN _deploy_resolved_units ru ON ru.unit_key = e.unit_key
WHERE lower(u.email) = lower(e.email)
  AND (
    u."unitId" IS DISTINCT FROM ru.unit_id
    OR u."mantenedoraId" IS DISTINCT FROM ru."mantenedoraId"
    OR u.status::TEXT <> 'ATIVO'
    OR u."emailVerified" IS DISTINCT FROM TRUE
  );

\echo '2/6 - Criando usuários ausentes quando houver hash de senha reaproveitável...'
WITH password_source AS (
  SELECT password
  FROM "User"
  WHERE password IS NOT NULL AND length(password) > 20
  ORDER BY CASE WHEN lower(email) = 'adriel-souza11@hotmail.com' THEN 0 ELSE 1 END, "createdAt"
  LIMIT 1
)
INSERT INTO "User" (
  id, "mantenedoraId", "unitId", email, password,
  "firstName", "lastName", status, "emailVerified", "createdAt", "updatedAt"
)
SELECT
  'auto_user_' || substr(md5(lower(e.email)), 1, 24),
  ru."mantenedoraId",
  ru.unit_id,
  lower(e.email),
  ps.password,
  initcap(split_part(split_part(lower(e.email), '@', 1), '.', 1)),
  'COCRIS',
  'ATIVO'::"UserStatus",
  TRUE,
  NOW(),
  NOW()
FROM _deploy_access_expected e
JOIN _deploy_resolved_units ru ON ru.unit_key = e.unit_key
CROSS JOIN password_source ps
WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE lower(u.email) = lower(e.email));

\echo '3/6 - Desativando roles operacionais divergentes da matriz oficial...'
UPDATE "UserRole" ur
SET "isActive" = FALSE,
    "updatedAt" = NOW()
FROM "User" u
JOIN _deploy_access_expected e ON lower(e.email) = lower(u.email)
JOIN "Role" r ON r.id = ur."roleId"
WHERE ur."userId" = u.id
  AND ur."isActive" = TRUE
  AND r.level::TEXT IN ('UNIDADE', 'PROFESSOR')
  AND r.type::TEXT <> e.role_type;

\echo '4/6 - Garantindo UserRole ativo esperado para a matriz oficial...'
WITH desired AS (
  SELECT
    u.id AS user_id,
    r.id AS role_id,
    r.level AS scope_level
  FROM _deploy_access_expected e
  JOIN "User" u ON lower(u.email) = lower(e.email)
  JOIN _deploy_resolved_units ru ON ru.unit_key = e.unit_key
  JOIN "Role" r ON r."mantenedoraId" = ru."mantenedoraId" AND r.type::TEXT = e.role_type
  WHERE r."isActive" = TRUE
)
INSERT INTO "UserRole" (id, "userId", "roleId", "scopeLevel", "isActive", "createdAt", "updatedAt")
SELECT
  'auto_role_' || substr(md5(d.user_id || ':' || d.role_id), 1, 24),
  d.user_id,
  d.role_id,
  d.scope_level,
  TRUE,
  NOW(),
  NOW()
FROM desired d
ON CONFLICT ("userId", "roleId")
DO UPDATE SET
  "scopeLevel" = EXCLUDED."scopeLevel",
  "isActive" = TRUE,
  "updatedAt" = NOW();

\echo '5/6 - Garantindo UserRoleUnitScope da unidade resolvida...'
WITH desired_scope AS (
  SELECT
    ur.id AS user_role_id,
    ru.unit_id
  FROM _deploy_access_expected e
  JOIN "User" u ON lower(u.email) = lower(e.email)
  JOIN _deploy_resolved_units ru ON ru.unit_key = e.unit_key
  JOIN "Role" r ON r."mantenedoraId" = ru."mantenedoraId" AND r.type::TEXT = e.role_type
  JOIN "UserRole" ur ON ur."userId" = u.id AND ur."roleId" = r.id AND ur."isActive" = TRUE
)
INSERT INTO "UserRoleUnitScope" (id, "userRoleId", "unitId", "createdAt")
SELECT
  'auto_scope_' || substr(md5(ds.user_role_id || ':' || ds.unit_id), 1, 24),
  ds.user_role_id,
  ds.unit_id,
  NOW()
FROM desired_scope ds
ON CONFLICT ("userRoleId", "unitId") DO NOTHING;

\echo '6/6 - Desativando UserRole de perfis sem acesso operacional...'
UPDATE "UserRole" ur
SET "isActive" = FALSE,
    "updatedAt" = NOW()
FROM "User" u
JOIN _deploy_no_access_email nae ON lower(nae.email) = lower(u.email)
WHERE ur."userId" = u.id
  AND ur."isActive" = TRUE;

\echo 'Verificação antes do COMMIT - resumo por unidade e role:'
SELECT
  ru.unit_key,
  ru.name AS unidade_resolvida,
  e.role_type,
  COUNT(*) AS esperados,
  COUNT(u.id) AS usuarios_existentes,
  COUNT(*) FILTER (WHERE u.status::TEXT = 'ATIVO') AS usuarios_ativos,
  COUNT(*) FILTER (WHERE u."unitId" = ru.unit_id) AS unitid_ok,
  COUNT(*) FILTER (WHERE ur."isActive" = TRUE) AS role_ativa_ok,
  COUNT(*) FILTER (WHERE us."unitId" = ru.unit_id) AS scope_ok
FROM _deploy_access_expected e
JOIN _deploy_resolved_units ru ON ru.unit_key = e.unit_key
LEFT JOIN "User" u ON lower(u.email) = lower(e.email)
LEFT JOIN "Role" r ON r."mantenedoraId" = ru."mantenedoraId" AND r.type::TEXT = e.role_type
LEFT JOIN "UserRole" ur ON ur."userId" = u.id AND ur."roleId" = r.id AND ur."isActive" = TRUE
LEFT JOIN "UserRoleUnitScope" us ON us."userRoleId" = ur.id AND us."unitId" = ru.unit_id
GROUP BY ru.unit_key, ru.name, e.role_type
ORDER BY ru.unit_key, e.role_type;

\echo 'Verificação antes do COMMIT - perfis sem acesso ainda com role ativa:'
SELECT u.email, COUNT(ur.id) AS roles_ativas_restantes
FROM _deploy_no_access_email nae
JOIN "User" u ON lower(u.email) = lower(nae.email)
JOIN "UserRole" ur ON ur."userId" = u.id AND ur."isActive" = TRUE
GROUP BY u.email
ORDER BY u.email;

COMMIT;

\echo 'AUTO DEPLOY - Correção idempotente de acessos concluída.'
