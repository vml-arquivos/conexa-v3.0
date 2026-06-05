-- Conferência do Seed CEPI Flamboyant
SELECT id, name, code, capacity, "isActive" FROM "Unit" WHERE code = 'FLAMBOYANT';
SELECT COUNT(*) AS profissionais FROM "User" WHERE "unitId" = 'seed_unit_flamboyant';
SELECT COUNT(*) AS alunos FROM "Child" WHERE "unitId" = 'seed_unit_flamboyant';
SELECT c.name AS turma, COUNT(e.id) AS matriculas
FROM "Classroom" c
LEFT JOIN "Enrollment" e ON e."classroomId" = c.id AND e.status = 'ATIVA'
WHERE c."unitId" = 'seed_unit_flamboyant'
GROUP BY c.name
ORDER BY c.name;
SELECT email, "firstName", "lastName", phone
FROM "User"
WHERE "unitId" = 'seed_unit_flamboyant'
ORDER BY "firstName";
SELECT email, "firstName", "lastName", phone
FROM "User"
WHERE "unitId" = 'seed_unit_flamboyant'
  AND (email IS NULL OR email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
ORDER BY "firstName";
