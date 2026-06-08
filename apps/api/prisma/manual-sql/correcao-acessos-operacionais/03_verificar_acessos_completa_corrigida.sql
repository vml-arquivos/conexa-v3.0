\pset pager off
\timing on

\echo '============================================================'
\echo 'CHECK 0 - Banco conectado e schema atual'
\echo '============================================================'
SELECT current_database() AS database_atual, current_schema() AS schema_atual, NOW() AS verificado_em;

\echo '============================================================'
\echo 'CHECK 1 - Matriz oficial detalhada: usuário, unitId, role ativa esperada e scope'
\echo '============================================================'
WITH expected(email, expected_role, expected_unitid, expected_unit_name) AS (
  VALUES
  ('adriananarciso.ve@gmail.com','UNIDADE_DIRETOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('sontosclea@hotmail.com','UNIDADE_COORDENADOR_PEDAGOGICO','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('gomescarolina.marques@gmail.com','UNIDADE_NUTRICIONISTA','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('gessica_gcp@hotmail.com','UNIDADE_ADMINISTRATIVO','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('vanderlon.tavares@cocris.org','UNIDADE_ADMINISTRATIVO','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('cryscunhasilva@gmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('edinaleite8556@gmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('elaynne87@gmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('geisacap30@gmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('lilia_santosaraujo@hotmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('meirocaabreu34@gmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('sisiflamenguista@hotmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('stephaniepassos680@gmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('suelyvieira85@gmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('ppasantana@gmail.com','UNIDADE_DIRETOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('fatinha.cord21@gmail.com','UNIDADE_COORDENADOR_PEDAGOGICO','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('flavia.raphaely@hotmail.com','UNIDADE_ADMINISTRATIVO','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('brunapires.nutri@gmail.com','UNIDADE_NUTRICIONISTA','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('amandhacardoso1994@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('carlacristina378@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('catiapessoa0530@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('ds411698@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('elenicebispo.563@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('mariajucelia1980@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('marlenemkm@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('rosamarinho229@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('tatilamichele88@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('ddacruz385@gmail.com','UNIDADE_DIRETOR','unit-arara-caninde','CEPI Arara Canindé'),
  ('coordenadoracaarol@gmail.com','UNIDADE_COORDENADOR_PEDAGOGICO','unit-arara-caninde','CEPI Arara Canindé'),
  ('ds.viana@yahoo.com.br','UNIDADE_NUTRICIONISTA','unit-arara-caninde','CEPI Arara Canindé'),
  ('adriel-souza11@hotmail.com','UNIDADE_ADMINISTRATIVO','unit-arara-caninde','CEPI Arara Canindé'),
  ('suladiretora2025@gmail.com','UNIDADE_DIRETOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('coordenacaopelicano@gmail.com','UNIDADE_COORDENADOR_PEDAGOGICO','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('profnascimento36@gmail.com','UNIDADE_COORDENADOR_PEDAGOGICO','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('israelrodriface@gmail.com','UNIDADE_ADMINISTRATIVO','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('talitasaracalebe@gmail.com','UNIDADE_ADMINISTRATIVO','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('nutricassiafernandes@gmail.com','UNIDADE_NUTRICIONISTA','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('profadacristina@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('profadrianacarlas2025@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('apollianamaria@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('pelicanoclaudia2025@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('clicianeprof2026@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('daniprof2026@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('professoraelza36@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('proffrancispelicano@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('pedagogamariacida@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('professoramiriam8@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('pri.professora2025@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('professorasabrinaolive2025@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('saletepires1204@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('shirlene.professora2025@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('professorasilvia56@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('fernandaprof@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil')
), user_active_roles AS (
  SELECT
    u.id AS user_id,
    STRING_AGG(DISTINCT r.type::text, ', ' ORDER BY r.type::text) AS active_roles
  FROM "User" u
  JOIN "UserRole" ur ON ur."userId" = u.id AND ur."isActive" = true
  JOIN "Role" r ON r.id = ur."roleId"
  GROUP BY u.id
)
SELECT
  e.expected_unit_name,
  e.email,
  CASE WHEN u.id IS NULL THEN 'USUARIO_INEXISTENTE' ELSE 'USUARIO_EXISTE' END AS usuario,
  u.status,
  u."unitId" AS user_unitid,
  e.expected_unitid,
  CASE
    WHEN u.id IS NULL THEN 'NAO_AVALIADO'
    WHEN u."unitId" = e.expected_unitid THEN 'UNIT_OK'
    ELSE 'UNIT_DIVERGENTE'
  END AS check_unit,
  COALESCE(uar.active_roles, '(sem role ativa)') AS roles_ativas_no_usuario,
  e.expected_role,
  CASE WHEN r_expected.id IS NOT NULL THEN 'ROLE_OK' ELSE 'ROLE_DIVERGENTE_OU_AUSENTE' END AS check_role,
  us."unitId" AS scope_unitid,
  CASE WHEN us."unitId" = e.expected_unitid THEN 'SCOPE_OK' ELSE 'SCOPE_DIVERGENTE_OU_AUSENTE' END AS check_scope
FROM expected e
LEFT JOIN "User" u ON lower(u.email) = lower(e.email)
LEFT JOIN user_active_roles uar ON uar.user_id = u.id
LEFT JOIN "UserRole" ur_expected ON ur_expected."userId" = u.id AND ur_expected."isActive" = true
LEFT JOIN "Role" r_expected ON r_expected.id = ur_expected."roleId" AND r_expected.type::text = e.expected_role
LEFT JOIN "UserRoleUnitScope" us ON us."userRoleId" = ur_expected.id AND us."unitId" = e.expected_unitid
ORDER BY e.expected_unit_name, e.expected_role, e.email;

\echo '============================================================'
\echo 'CHECK 2 - Resumo da matriz oficial por unidade'
\echo '============================================================'
WITH expected(email, expected_role, expected_unitid, expected_unit_name) AS (
  VALUES
  ('adriananarciso.ve@gmail.com','UNIDADE_DIRETOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('sontosclea@hotmail.com','UNIDADE_COORDENADOR_PEDAGOGICO','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('gomescarolina.marques@gmail.com','UNIDADE_NUTRICIONISTA','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('gessica_gcp@hotmail.com','UNIDADE_ADMINISTRATIVO','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('vanderlon.tavares@cocris.org','UNIDADE_ADMINISTRATIVO','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('cryscunhasilva@gmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('edinaleite8556@gmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('elaynne87@gmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('geisacap30@gmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('lilia_santosaraujo@hotmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('meirocaabreu34@gmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('sisiflamenguista@hotmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('stephaniepassos680@gmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('suelyvieira85@gmail.com','PROFESSOR','cmmbhsz23000bmemp6u11ocds','CEPI Flamboyant'),
  ('ppasantana@gmail.com','UNIDADE_DIRETOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('fatinha.cord21@gmail.com','UNIDADE_COORDENADOR_PEDAGOGICO','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('flavia.raphaely@hotmail.com','UNIDADE_ADMINISTRATIVO','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('brunapires.nutri@gmail.com','UNIDADE_NUTRICIONISTA','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('amandhacardoso1994@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('carlacristina378@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('catiapessoa0530@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('ds411698@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('elenicebispo.563@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('mariajucelia1980@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('marlenemkm@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('rosamarinho229@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('tatilamichele88@gmail.com','PROFESSOR','cmmbhsz1o0005mempvrlz3n0g','CEPI Sabiá do Campo'),
  ('ddacruz385@gmail.com','UNIDADE_DIRETOR','unit-arara-caninde','CEPI Arara Canindé'),
  ('coordenadoracaarol@gmail.com','UNIDADE_COORDENADOR_PEDAGOGICO','unit-arara-caninde','CEPI Arara Canindé'),
  ('ds.viana@yahoo.com.br','UNIDADE_NUTRICIONISTA','unit-arara-caninde','CEPI Arara Canindé'),
  ('adriel-souza11@hotmail.com','UNIDADE_ADMINISTRATIVO','unit-arara-caninde','CEPI Arara Canindé'),
  ('suladiretora2025@gmail.com','UNIDADE_DIRETOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('coordenacaopelicano@gmail.com','UNIDADE_COORDENADOR_PEDAGOGICO','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('profnascimento36@gmail.com','UNIDADE_COORDENADOR_PEDAGOGICO','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('israelrodriface@gmail.com','UNIDADE_ADMINISTRATIVO','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('talitasaracalebe@gmail.com','UNIDADE_ADMINISTRATIVO','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('nutricassiafernandes@gmail.com','UNIDADE_NUTRICIONISTA','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('profadacristina@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('profadrianacarlas2025@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('apollianamaria@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('pelicanoclaudia2025@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('clicianeprof2026@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('daniprof2026@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('professoraelza36@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('proffrancispelicano@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('pedagogamariacida@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('professoramiriam8@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('pri.professora2025@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('professorasabrinaolive2025@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('saletepires1204@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('shirlene.professora2025@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('professorasilvia56@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil'),
  ('fernandaprof@gmail.com','PROFESSOR','cmmbhsz1y0009mempaeb9uqm9','Pelicano – Centro de Convivência e Educação Infantil')
)
SELECT
  e.expected_unit_name,
  COUNT(*) AS esperados,
  COUNT(u.id) AS usuarios_existentes,
  COUNT(*) FILTER (WHERE u.status::text = 'ATIVO') AS usuarios_ativos,
  COUNT(*) FILTER (WHERE u."unitId" = e.expected_unitid) AS unitid_ok,
  COUNT(*) FILTER (WHERE r_expected.type::text = e.expected_role) AS role_ok,
  COUNT(*) FILTER (WHERE us."unitId" = e.expected_unitid) AS scope_ok
FROM expected e
LEFT JOIN "User" u ON lower(u.email) = lower(e.email)
LEFT JOIN "UserRole" ur_expected ON ur_expected."userId" = u.id AND ur_expected."isActive" = true
LEFT JOIN "Role" r_expected ON r_expected.id = ur_expected."roleId" AND r_expected.type::text = e.expected_role
LEFT JOIN "UserRoleUnitScope" us ON us."userRoleId" = ur_expected.id AND us."unitId" = e.expected_unitid
GROUP BY e.expected_unit_name
ORDER BY e.expected_unit_name;

\echo '============================================================'
\echo 'CHECK 3 - Usuários ativos de unidade/professor sem scope'
\echo '============================================================'
SELECT u.email, u.status, r.type AS role_type, u."unitId", un.name AS unidade_do_usuario
FROM "User" u
JOIN "UserRole" ur ON ur."userId" = u.id AND ur."isActive" = true
JOIN "Role" r ON r.id = ur."roleId"
LEFT JOIN "UserRoleUnitScope" us ON us."userRoleId" = ur.id
LEFT JOIN "Unit" un ON un.id = u."unitId"
WHERE r.level::text IN ('UNIDADE','PROFESSOR')
  AND us."unitId" IS NULL
  AND u.email NOT LIKE '%testepiloto%'
  AND u.email NOT LIKE '%cepi.com.br'
ORDER BY u.email;

\echo '============================================================'
\echo 'CHECK 4 - Perfis sem acesso/monitor com role ativa'
\echo '============================================================'
SELECT u.email, u.status, r.type AS role_ativa, ur."isActive", u."unitId", un.name AS unidade
FROM "User" u
JOIN "UserRole" ur ON ur."userId" = u.id AND ur."isActive" = true
JOIN "Role" r ON r.id = ur."roleId"
LEFT JOIN "Unit" un ON un.id = u."unitId"
WHERE u.email IN (
  'anakarolynetomaz@gmail.com','adarleide09@gmail.com','fernandaanabia@gmail.com',
  'isadoraoliveirarodrigues531@gmail.com','gamajaine@gmail.com','jessicalima07mix@gmail.com',
  'thamitj1@gmail.com','lindakaka39@gmail.com','contatolidiav@gmail.com',
  'maisaf2019@gmail.com','fatimagt10@hotmail.com','marlenedejesussantos31@gmail.com',
  'si_gorreia@hotmail.com','tomazthaina4@gmail.com','thalyaalvesmachado@gmail.com',
  'vivimorais3003@gmail.com','naninhadf2012@gmail.com','fernandab.silva1606@gmail.com',
  'giiooaraujoomend@gmail.com','graacy.dutra@gmail.com','jayaneyasmim822@gmail.com',
  'jessicafbastos@hotmail.com','darckrocha@gmail.com','joyceudgg77284@gmail.com',
  'kauannysthefany75@gmail.com','mariaexp157842@gmail.com','mara08_@hotmail.com',
  'milena_1ribeiro@icloud.com','patricia.tgb.pb@gmail.com','rayane.raypereira@gmail.com',
  'sheronferreira14@gmail.com','yslane.galeno@gmail.com','riksondutra@gmail.com'
)
ORDER BY u.email;

\echo '============================================================'
\echo 'CHECK 5 - Colaboradores por unidade e role via scope ativo'
\echo '============================================================'
SELECT
  un.name AS unidade,
  r.type AS role,
  COUNT(*) AS total,
  STRING_AGG(u.email, ', ' ORDER BY u.email) AS emails
FROM "User" u
JOIN "UserRole" ur ON ur."userId" = u.id AND ur."isActive" = true
JOIN "Role" r ON r.id = ur."roleId"
JOIN "UserRoleUnitScope" us ON us."userRoleId" = ur.id
JOIN "Unit" un ON un.id = us."unitId"
WHERE u.email NOT LIKE '%testepiloto%'
  AND u.email NOT LIKE '%cepi.com.br'
  AND r.level::text IN ('UNIDADE','PROFESSOR')
GROUP BY un.name, r.type
ORDER BY un.name, r.type;

\echo '============================================================'
\echo 'CHECK 6 - Pedagógico por Unit.id oficial via Unit -> Child/Classroom'
\echo '============================================================'
SELECT
  u.id AS unitid,
  u.code,
  u.name AS unidade,
  COUNT(DISTINCT c.id) AS alunos,
  COUNT(DISTINCT e.id) FILTER (WHERE e.status::text = 'ATIVA') AS matriculas_ativas,
  COUNT(DISTINCT cl.id) AS turmas,
  COUNT(DISTINCT ct."teacherId") FILTER (WHERE ct."isActive" = true) AS professores_em_turma
FROM "Unit" u
LEFT JOIN "Child" c ON c."unitId" = u.id
LEFT JOIN "Enrollment" e ON e."childId" = c.id
LEFT JOIN "Classroom" cl ON cl."unitId" = u.id
LEFT JOIN "ClassroomTeacher" ct ON ct."classroomId" = cl.id
WHERE u.name NOT LIKE '%PILOTO%'
GROUP BY u.id, u.code, u.name
ORDER BY u.name;

\echo '============================================================'
\echo 'CHECK 7 - Pedagógico agrupado diretamente por Child.unitId, incluindo órfãos/IDs legados'
\echo '============================================================'
SELECT
  c."unitId" AS child_unitid,
  un.name AS unidade_encontrada,
  un.code AS unit_code,
  COUNT(DISTINCT c.id) AS alunos,
  COUNT(DISTINCT e.id) FILTER (WHERE e.status::text = 'ATIVA') AS matriculas_ativas
FROM "Child" c
LEFT JOIN "Unit" un ON un.id = c."unitId"
LEFT JOIN "Enrollment" e ON e."childId" = c.id
GROUP BY c."unitId", un.name, un.code
ORDER BY un.name NULLS LAST, c."unitId";

\echo '============================================================'
\echo 'CHECK 8 - Turmas agrupadas diretamente por Classroom.unitId, incluindo órfãos/IDs legados'
\echo '============================================================'
SELECT
  cl."unitId" AS classroom_unitid,
  un.name AS unidade_encontrada,
  un.code AS unit_code,
  COUNT(DISTINCT cl.id) AS turmas,
  COUNT(DISTINCT ct."teacherId") FILTER (WHERE ct."isActive" = true) AS professores_em_turma
FROM "Classroom" cl
LEFT JOIN "Unit" un ON un.id = cl."unitId"
LEFT JOIN "ClassroomTeacher" ct ON ct."classroomId" = cl.id
GROUP BY cl."unitId", un.name, un.code
ORDER BY un.name NULLS LAST, cl."unitId";

\echo '============================================================'
\echo 'CHECK 9 - Unidades Flamboyant/Pelicano por nome, código ou IDs conhecidos'
\echo '============================================================'
SELECT id, code, name, "mantenedoraId", status, "createdAt", "updatedAt"
FROM "Unit"
WHERE id IN ('seed_unit_flamboyant','cmmbhsz23000bmemp6u11ocds','cmmbhsz1y0009mempaeb9uqm9')
   OR lower(name) LIKE '%flamboyant%'
   OR lower(name) LIKE '%pelicano%'
   OR code IN ('FLAMBOY','PELICANO')
ORDER BY name, id;

\echo '============================================================'
\echo 'CHECK 10 - Duplicidade de usuários oficiais por email'
\echo '============================================================'
WITH official_emails(email) AS (
  VALUES
  ('adriananarciso.ve@gmail.com'),('sontosclea@hotmail.com'),('gomescarolina.marques@gmail.com'),('gessica_gcp@hotmail.com'),('vanderlon.tavares@cocris.org'),('cryscunhasilva@gmail.com'),('edinaleite8556@gmail.com'),('elaynne87@gmail.com'),('geisacap30@gmail.com'),('lilia_santosaraujo@hotmail.com'),('meirocaabreu34@gmail.com'),('sisiflamenguista@hotmail.com'),('stephaniepassos680@gmail.com'),('suelyvieira85@gmail.com'),
  ('ppasantana@gmail.com'),('fatinha.cord21@gmail.com'),('flavia.raphaely@hotmail.com'),('brunapires.nutri@gmail.com'),('amandhacardoso1994@gmail.com'),('carlacristina378@gmail.com'),('catiapessoa0530@gmail.com'),('ds411698@gmail.com'),('elenicebispo.563@gmail.com'),('mariajucelia1980@gmail.com'),('marlenemkm@gmail.com'),('rosamarinho229@gmail.com'),('tatilamichele88@gmail.com'),
  ('ddacruz385@gmail.com'),('coordenadoracaarol@gmail.com'),('ds.viana@yahoo.com.br'),('adriel-souza11@hotmail.com'),
  ('suladiretora2025@gmail.com'),('coordenacaopelicano@gmail.com'),('profnascimento36@gmail.com'),('israelrodriface@gmail.com'),('talitasaracalebe@gmail.com'),('nutricassiafernandes@gmail.com'),('profadacristina@gmail.com'),('profadrianacarlas2025@gmail.com'),('apollianamaria@gmail.com'),('pelicanoclaudia2025@gmail.com'),('clicianeprof2026@gmail.com'),('daniprof2026@gmail.com'),('professoraelza36@gmail.com'),('proffrancispelicano@gmail.com'),('pedagogamariacida@gmail.com'),('professoramiriam8@gmail.com'),('pri.professora2025@gmail.com'),('professorasabrinaolive2025@gmail.com'),('saletepires1204@gmail.com'),('shirlene.professora2025@gmail.com'),('professorasilvia56@gmail.com'),('fernandaprof@gmail.com')
)
SELECT lower(u.email) AS email_normalizado, COUNT(*) AS ocorrencias, STRING_AGG(u.id, ', ' ORDER BY u.id) AS user_ids
FROM "User" u
JOIN official_emails oe ON lower(oe.email) = lower(u.email)
GROUP BY lower(u.email)
HAVING COUNT(*) > 1
ORDER BY lower(u.email);
