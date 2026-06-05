-- Conferência de qualidade CEPI Pelicano + CEPI Flamboyant
-- Executar após os seeds para verificar totais e possíveis e-mails inválidos.
-- Versão corrigida: conta por Unit.code, não por ids técnicos fixos.

SELECT u.code AS unidade, COUNT(ch.id) AS alunos
FROM "Unit" u
LEFT JOIN "Child" ch ON ch."unitId" = u.id
WHERE u.code IN ('PELICANO','FLAMBOYANT')
GROUP BY u.code
ORDER BY u.code;

SELECT u.code AS unidade, COUNT(us.id) AS profissionais
FROM "Unit" u
LEFT JOIN "User" us ON us."unitId" = u.id
WHERE u.code IN ('PELICANO','FLAMBOYANT')
GROUP BY u.code
ORDER BY u.code;

SELECT u.code AS unidade, us.email, us."firstName", us."lastName", us.phone
FROM "Unit" u
JOIN "User" us ON us."unitId" = u.id
WHERE u.code IN ('PELICANO','FLAMBOYANT')
  AND (us.email IS NULL OR us.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
ORDER BY u.code, us."firstName";

SELECT u.code AS unidade, c.name AS turma, COUNT(e.id) AS matriculas
FROM "Unit" u
JOIN "Classroom" c ON c."unitId" = u.id
LEFT JOIN "Enrollment" e ON e."classroomId" = c.id AND e.status = 'ATIVA'
WHERE u.code IN ('PELICANO','FLAMBOYANT')
GROUP BY u.code, c.name
ORDER BY u.code, c.name;
