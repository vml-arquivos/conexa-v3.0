-- Conferência CEPI Pelicano após importação
SELECT id, name, code, capacity, "isActive" FROM "Unit" WHERE code='PELICANO';
SELECT COUNT(*) AS profissionais FROM "User" WHERE "unitId"=(SELECT id FROM "Unit" WHERE code='PELICANO' LIMIT 1);
SELECT COUNT(*) AS alunos FROM "Child" WHERE "unitId"=(SELECT id FROM "Unit" WHERE code='PELICANO' LIMIT 1);
SELECT c.name AS turma, COUNT(e.id) AS matriculas
FROM "Classroom" c
LEFT JOIN "Enrollment" e ON e."classroomId"=c.id AND e.status='ATIVA'
WHERE c."unitId"=(SELECT id FROM "Unit" WHERE code='PELICANO' LIMIT 1)
GROUP BY c.name
ORDER BY c.name;
SELECT email, "firstName", "lastName", phone FROM "User" WHERE "unitId"=(SELECT id FROM "Unit" WHERE code='PELICANO' LIMIT 1) ORDER BY email;
