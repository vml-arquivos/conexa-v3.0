-- Conferência de qualidade CEPI Pelicano + CEPI Flamboyant
-- Executar após os seeds para verificar totais e possíveis e-mails inválidos.
SELECT 'PELICANO' AS unidade, COUNT(*) AS alunos FROM "Child" WHERE "unitId" = 'seed_unit_pelicano'
UNION ALL
SELECT 'FLAMBOYANT' AS unidade, COUNT(*) AS alunos FROM "Child" WHERE "unitId" = 'seed_unit_flamboyant';

SELECT 'PELICANO' AS unidade, COUNT(*) AS profissionais FROM "User" WHERE "unitId" = 'seed_unit_pelicano'
UNION ALL
SELECT 'FLAMBOYANT' AS unidade, COUNT(*) AS profissionais FROM "User" WHERE "unitId" = 'seed_unit_flamboyant';

SELECT 'PELICANO' AS unidade, email, "firstName", "lastName", phone
FROM "User"
WHERE "unitId" = 'seed_unit_pelicano'
  AND (email IS NULL OR email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
UNION ALL
SELECT 'FLAMBOYANT' AS unidade, email, "firstName", "lastName", phone
FROM "User"
WHERE "unitId" = 'seed_unit_flamboyant'
  AND (email IS NULL OR email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
ORDER BY unidade, "firstName";

SELECT u.code AS unidade, c.name AS turma, COUNT(e.id) AS matriculas
FROM "Unit" u
JOIN "Classroom" c ON c."unitId" = u.id
LEFT JOIN "Enrollment" e ON e."classroomId" = c.id AND e.status = 'ATIVA'
WHERE u.code IN ('PELICANO','FLAMBOYANT')
GROUP BY u.code, c.name
ORDER BY u.code, c.name;
