
-- CONEXA - Diagnóstico seguro de acessos, unidades e vínculos
-- Somente leitura. Não altera dados. Não faz UPDATE/DELETE/INSERT.
-- Execute no banco PostgreSQL do Conexa:
-- docker cp /root/diagnostico_acessos_unidades.sql w12b7gmnfug9fdi7kxdabrge:/tmp/diagnostico_acessos_unidades.sql
-- docker exec -it w12b7gmnfug9fdi7kxdabrge psql -U postgres -d postgres -f /tmp/diagnostico_acessos_unidades.sql

\echo '===================================================================='
\echo '1) UNIDADES CADASTRADAS'
\echo '===================================================================='
SELECT id, name, code, capacity, "isActive", "createdAt", "updatedAt"
FROM "Unit"
ORDER BY name, code;

\echo '===================================================================='
\echo '2) POSSÍVEIS UNIDADES DUPLICADAS POR NOME'
\echo '===================================================================='
SELECT lower(trim(name)) AS nome_normalizado, COUNT(*) AS total, string_agg(code, ', ' ORDER BY code) AS codigos
FROM "Unit"
GROUP BY lower(trim(name))
HAVING COUNT(*) > 1
ORDER BY total DESC, nome_normalizado;

\echo '===================================================================='
\echo '3) RESUMO DE USUÁRIOS POR UNIDADE E PERFIL'
\echo '===================================================================='
SELECT
  COALESCE(un.name, 'SEM UNIDADE / CENTRAL') AS unidade,
  COALESCE(un.code, 'CENTRAL') AS codigo_unidade,
  COALESCE(r.type::text, 'SEM ROLE') AS role_type,
  COUNT(*) AS total
FROM "User" u
LEFT JOIN "Unit" un ON un.id = u."unitId"
LEFT JOIN "UserRole" ur ON ur."userId" = u.id
LEFT JOIN "Role" r ON r.id = ur."roleId"
WHERE u.email IS NOT NULL
GROUP BY un.name, un.code, r.type
ORDER BY unidade, role_type;

\echo '===================================================================='
\echo '4) LOGINS ADMINISTRATIVOS ESPERADOS DA ARARA CANINDÉ'
\echo '===================================================================='
SELECT
  u.id,
  u.email,
  u."firstName",
  u."lastName",
  u.phone,
  u.status::text AS status,
  COALESCE(un.name, 'SEM UNIDADE') AS unidade,
  COALESCE(un.code, 'SEM CODIGO') AS codigo_unidade,
  r.name AS role_name,
  r.type::text AS role_type,
  r.level::text AS role_level,
  CASE WHEN u.password IS NULL OR length(u.password) < 20 THEN 'SENHA AUSENTE/INVÁLIDA' ELSE 'HASH PRESENTE' END AS senha_status,
  u."lastLogin"
FROM "User" u
LEFT JOIN "Unit" un ON un.id = u."unitId"
LEFT JOIN "UserRole" ur ON ur."userId" = u.id
LEFT JOIN "Role" r ON r.id = ur."roleId"
WHERE lower(u.email) IN (
  'ddacruz385@gmail.com',
  'coordenadoracaarol@gmail.com',
  'ds.viana@yahoo.com.br',
  'adriel-souza11@hotmail.com',
  'diretor@arara.com',
  'coordenador@cepi.com.br',
  'nutri@arara.com'
)
ORDER BY u.email, r.type;

\echo '===================================================================='
\echo '5) USUÁRIOS DA ARARA CANINDÉ ATUAIS'
\echo '===================================================================='
SELECT
  un.name AS unidade,
  un.code AS codigo_unidade,
  u.id,
  u.email,
  u."firstName",
  u."lastName",
  u.phone,
  u.status::text AS status,
  COALESCE(r.name, 'SEM ROLE') AS role_name,
  COALESCE(r.type::text, 'SEM ROLE') AS role_type,
  COALESCE(r.level::text, 'SEM LEVEL') AS role_level,
  u."lastLogin"
FROM "User" u
JOIN "Unit" un ON un.id = u."unitId"
LEFT JOIN "UserRole" ur ON ur."userId" = u.id
LEFT JOIN "Role" r ON r.id = ur."roleId"
WHERE un.code = 'ARARA-CANINDE'
ORDER BY role_type, u.email;

\echo '===================================================================='
\echo '6) USUÁRIOS COM STAFF_CENTRAL'
\echo '===================================================================='
SELECT
  u.id,
  u.email,
  u."firstName",
  u."lastName",
  u.phone,
  u.status::text AS status,
  COALESCE(un.name, 'SEM UNIDADE / CENTRAL') AS unidade,
  COALESCE(un.code, 'CENTRAL') AS codigo_unidade,
  r.name AS role_name,
  r.type::text AS role_type,
  r.level::text AS role_level,
  u."lastLogin"
FROM "User" u
JOIN "UserRole" ur ON ur."userId" = u.id
JOIN "Role" r ON r.id = ur."roleId"
LEFT JOIN "Unit" un ON un.id = u."unitId"
WHERE r.type::text LIKE 'STAFF_CENTRAL%'
ORDER BY u.email;

\echo '===================================================================='
\echo '7) USUÁRIOS COM MAIS DE UMA ROLE'
\echo '===================================================================='
SELECT
  u.id,
  u.email,
  u."firstName",
  u."lastName",
  COALESCE(un.name, 'SEM UNIDADE / CENTRAL') AS unidade,
  COALESCE(un.code, 'CENTRAL') AS codigo_unidade,
  COUNT(r.id) AS total_roles,
  string_agg(r.type::text, ', ' ORDER BY r.type::text) AS roles
FROM "User" u
LEFT JOIN "Unit" un ON un.id = u."unitId"
LEFT JOIN "UserRole" ur ON ur."userId" = u.id
LEFT JOIN "Role" r ON r.id = ur."roleId"
GROUP BY u.id, u.email, u."firstName", u."lastName", un.name, un.code
HAVING COUNT(r.id) > 1
ORDER BY total_roles DESC, u.email;

\echo '===================================================================='
\echo '8) USUÁRIOS OPERACIONAIS SEM UNIDADE'
\echo '===================================================================='
SELECT
  u.id,
  u.email,
  u."firstName",
  u."lastName",
  u.status::text AS status,
  r.name AS role_name,
  r.type::text AS role_type,
  r.level::text AS role_level
FROM "User" u
JOIN "UserRole" ur ON ur."userId" = u.id
JOIN "Role" r ON r.id = ur."roleId"
WHERE u."unitId" IS NULL
AND r.type::text IN (
  'PROFESSOR',
  'PROFESSOR_AUXILIAR',
  'UNIDADE_DIRETOR',
  'UNIDADE_COORDENADOR_PEDAGOGICO',
  'UNIDADE_ADMINISTRATIVO',
  'UNIDADE_NUTRICIONISTA'
)
ORDER BY r.type::text, u.email;

\echo '===================================================================='
\echo '9) PROFESSOR_AUXILIAR / MONITORIA COM ACESSO'
\echo '===================================================================='
SELECT
  un.name AS unidade,
  un.code AS codigo_unidade,
  u.email,
  u."firstName",
  u."lastName",
  u.phone,
  u.status::text AS status,
  r.name AS role_name,
  r.type::text AS role_type
FROM "User" u
JOIN "UserRole" ur ON ur."userId" = u.id
JOIN "Role" r ON r.id = ur."roleId"
LEFT JOIN "Unit" un ON un.id = u."unitId"
WHERE r.type::text = 'PROFESSOR_AUXILIAR'
ORDER BY un.name, u.email;

\echo '===================================================================='
\echo '10) ALUNOS POR UNIDADE'
\echo '===================================================================='
SELECT
  un.name AS unidade,
  un.code AS codigo_unidade,
  COUNT(c.id) AS total_alunos
FROM "Child" c
JOIN "Unit" un ON un.id = c."unitId"
GROUP BY un.name, un.code
ORDER BY un.name;

\echo '===================================================================='
\echo '11) MATRÍCULAS POR UNIDADE E TURMA'
\echo '===================================================================='
SELECT
  un.name AS unidade,
  un.code AS codigo_unidade,
  cr.name AS turma,
  COUNT(e.id) AS matriculas
FROM "Enrollment" e
JOIN "Classroom" cr ON cr.id = e."classroomId"
JOIN "Unit" un ON un.id = cr."unitId"
GROUP BY un.name, un.code, cr.name
ORDER BY un.name, cr.name;

\echo '===================================================================='
\echo '12) ALUNOS COM UNITID DIFERENTE DA TURMA DA MATRÍCULA'
\echo '===================================================================='
SELECT
  c.id AS child_id,
  c."firstName",
  c."lastName",
  child_unit.name AS unidade_aluno,
  child_unit.code AS codigo_unidade_aluno,
  cr.name AS turma,
  class_unit.name AS unidade_turma,
  class_unit.code AS codigo_unidade_turma,
  e.status::text AS status_matricula
FROM "Enrollment" e
JOIN "Child" c ON c.id = e."childId"
JOIN "Unit" child_unit ON child_unit.id = c."unitId"
JOIN "Classroom" cr ON cr.id = e."classroomId"
JOIN "Unit" class_unit ON class_unit.id = cr."unitId"
WHERE c."unitId" <> cr."unitId"
ORDER BY c."firstName", c."lastName";

\echo '===================================================================='
\echo '13) ALUNOS SEM MATRÍCULA'
\echo '===================================================================='
SELECT
  un.name AS unidade,
  un.code AS codigo_unidade,
  c.id,
  c."firstName",
  c."lastName",
  c."codigoAluno",
  c.inscricao
FROM "Child" c
JOIN "Unit" un ON un.id = c."unitId"
LEFT JOIN "Enrollment" e ON e."childId" = c.id
WHERE e.id IS NULL
ORDER BY un.name, c."firstName", c."lastName";

\echo '===================================================================='
\echo '14) MATRÍCULAS ATIVAS DUPLICADAS POR ALUNO'
\echo '===================================================================='
SELECT
  c.id AS child_id,
  c."firstName",
  c."lastName",
  un.name AS unidade,
  COUNT(e.id) AS matriculas_ativas
FROM "Child" c
JOIN "Unit" un ON un.id = c."unitId"
JOIN "Enrollment" e ON e."childId" = c.id
WHERE e.status::text = 'ATIVA'
GROUP BY c.id, c."firstName", c."lastName", un.name
HAVING COUNT(e.id) > 1
ORDER BY matriculas_ativas DESC, c."firstName";

\echo '===================================================================='
\echo '15) LOGINS OPERACIONAIS POR UNIDADE, SEM MONITORES'
\echo '===================================================================='
SELECT
  un.name AS unidade,
  un.code AS codigo_unidade,
  u.email AS login,
  u."firstName" AS nome,
  u."lastName" AS sobrenome,
  u.phone AS telefone,
  u.status::text AS status,
  r.name AS perfil,
  r.type::text AS role_type,
  r.level::text AS nivel
FROM "User" u
JOIN "Unit" un ON un.id = u."unitId"
JOIN "UserRole" ur ON ur."userId" = u.id
JOIN "Role" r ON r.id = ur."roleId"
WHERE r.type::text IN (
  'PROFESSOR',
  'UNIDADE_DIRETOR',
  'UNIDADE_COORDENADOR_PEDAGOGICO',
  'UNIDADE_ADMINISTRATIVO',
  'UNIDADE_NUTRICIONISTA'
)
ORDER BY un.name, r.type::text, u."firstName", u."lastName";
