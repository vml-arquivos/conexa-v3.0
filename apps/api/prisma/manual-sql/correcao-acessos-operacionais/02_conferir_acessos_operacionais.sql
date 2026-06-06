
-- CONEXA - Conferência pós-correção de acessos operacionais
-- Somente leitura.

\echo '1) Logins administrativos reais da Arara'
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
JOIN "UserRole" ur ON ur."userId" = u.id
JOIN "Role" r ON r.id = ur."roleId"
WHERE lower(u.email) IN (
  'ddacruz385@gmail.com',
  'coordenadoracaarol@gmail.com',
  'ds.viana@yahoo.com.br',
  'adriel-souza11@hotmail.com'
)
ORDER BY r.type::text;

\echo '2) Logins operacionais ativos por unidade, sem monitoria'
SELECT
  un.name AS unidade,
  un.code AS codigo_unidade,
  r.type::text AS role_type,
  COUNT(*) AS total
FROM "User" u
JOIN "Unit" un ON un.id = u."unitId"
JOIN "UserRole" ur ON ur."userId" = u.id
JOIN "Role" r ON r.id = ur."roleId"
WHERE u.status::text = 'ATIVO'
  AND ur."isActive" = TRUE
  AND r.type::text IN (
    'PROFESSOR',
    'UNIDADE_DIRETOR',
    'UNIDADE_COORDENADOR_PEDAGOGICO',
    'UNIDADE_ADMINISTRATIVO',
    'UNIDADE_NUTRICIONISTA'
  )
GROUP BY un.name, un.code, r.type
ORDER BY un.name, r.type;

\echo '3) Monitoria/auxiliares ainda ativos com role ativa'
SELECT
  un.name AS unidade,
  un.code AS codigo_unidade,
  u.email,
  u."firstName",
  u."lastName",
  u.status::text AS status,
  r.type::text AS role_type,
  ur."isActive" AS role_ativa
FROM "User" u
JOIN "Unit" un ON un.id = u."unitId"
JOIN "UserRole" ur ON ur."userId" = u.id
JOIN "Role" r ON r.id = ur."roleId"
WHERE r.type::text = 'PROFESSOR_AUXILIAR'
  AND u.status::text = 'ATIVO'
  AND ur."isActive" = TRUE
ORDER BY un.name, u.email;

\echo '4) Alunos por unidade'
SELECT
  un.name AS unidade,
  un.code AS codigo_unidade,
  COUNT(c.id) AS total_alunos
FROM "Child" c
JOIN "Unit" un ON un.id = c."unitId"
GROUP BY un.name, un.code
ORDER BY un.name;

\echo '5) Alunos com unidade diferente da turma'
SELECT
  c.id AS child_id,
  c."firstName",
  c."lastName",
  child_unit.name AS unidade_aluno,
  class_unit.name AS unidade_turma,
  cr.name AS turma
FROM "Enrollment" e
JOIN "Child" c ON c.id = e."childId"
JOIN "Unit" child_unit ON child_unit.id = c."unitId"
JOIN "Classroom" cr ON cr.id = e."classroomId"
JOIN "Unit" class_unit ON class_unit.id = cr."unitId"
WHERE c."unitId" <> cr."unitId"
ORDER BY c."firstName";
