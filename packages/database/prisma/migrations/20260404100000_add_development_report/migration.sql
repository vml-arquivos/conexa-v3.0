-- Migration: Adiciona model DevelopmentReport (Relatório Individual de Desenvolvimento)
-- Branch: feat/development-report-model
-- Estratégia: 100% aditiva — CREATE TABLE, CREATE INDEX, ADD CONSTRAINT apenas
-- Gerado via: prisma migrate diff --from-schema-datamodel (main) --to-schema-datamodel (branch)

-- CreateTable
CREATE TABLE "DevelopmentReport" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DevelopmentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DevelopmentReport_childId_createdAt_idx" ON "DevelopmentReport"("childId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DevelopmentReport_classroomId_period_idx" ON "DevelopmentReport"("classroomId", "period");

-- AddForeignKey
ALTER TABLE "DevelopmentReport" ADD CONSTRAINT "DevelopmentReport_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentReport" ADD CONSTRAINT "DevelopmentReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentReport" ADD CONSTRAINT "DevelopmentReport_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentReport" ADD CONSTRAINT "DevelopmentReport_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
