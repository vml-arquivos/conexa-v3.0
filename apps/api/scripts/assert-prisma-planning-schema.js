/*
 * Build-time guard for the Planning Prisma Client.
 * Prevents a deploy from succeeding with a cached/stale Prisma Client.
 */
const { Prisma, PlanningType, PlanningStatus } = require('@prisma/client');

const requiredTypes = ['SEMANAL', 'QUINZENAL', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'];
const requiredStatuses = ['RASCUNHO', 'PUBLICADO', 'EM_EXECUCAO', 'CONCLUIDO', 'CANCELADO', 'EM_REVISAO', 'APROVADO', 'DEVOLVIDO'];
const requiredPlanningFields = [
  'id',
  'type',
  'startDate',
  'endDate',
  'status',
  'submittedAt',
  'reviewedAt',
  'reviewedBy',
  'reviewComment',
  'anoLetivo',
  'professorId',
  'observacoesTemplate',
];

const missingTypes = requiredTypes.filter((value) => !Object.values(PlanningType || {}).includes(value));
const missingStatuses = requiredStatuses.filter((value) => !Object.values(PlanningStatus || {}).includes(value));
const planningModel = Prisma?.dmmf?.datamodel?.models?.find((model) => model.name === 'Planning');
const planningFields = new Set((planningModel?.fields || []).map((field) => field.name));
const missingFields = requiredPlanningFields.filter((field) => !planningFields.has(field));

if (missingTypes.length || missingStatuses.length || missingFields.length) {
  console.error('❌ Prisma Client inconsistente para o módulo Planning.');
  if (missingTypes.length) console.error(`   PlanningType ausentes: ${missingTypes.join(', ')}`);
  if (missingStatuses.length) console.error(`   PlanningStatus ausentes: ${missingStatuses.join(', ')}`);
  if (missingFields.length) console.error(`   Campos Planning ausentes: ${missingFields.join(', ')}`);
  console.error('   Execute: npx prisma generate --schema=./prisma/schema.prisma');
  process.exit(1);
}

console.log('✅ Prisma Client do módulo Planning validado.');
