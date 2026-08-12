// ─── PATCH 1: Corrigir entity string → AuditLogEntity enum ─────────────────
// Arquivo: apps/api/src/planning/planning.service.ts
// Linha ~185 (dentro de createFromTemplate)
//
// ANTES:
//   entity: 'Planning',
// DEPOIS:
//   entity: AuditLogEntity.PLANNING,
//
// Garantir que AuditLogEntity está importado:
// import { AuditLogAction, AuditLogEntity } from '@prisma/client';
// (substituir a linha de import existente do AuditLogAction)

// ─── PATCH 2: Corrigir mapeamento de segment por ageGroupMin ────────────────
// Arquivo: apps/api/src/planning/planning.service.ts
// Afeta dois pontos: createFromTemplate (linha ~90) e create (linha ~246)
//
// ANTES (ambos os pontos):
//   if (ageGroupMin <= 18) segment = 'EI01';
//   else if (ageGroupMin <= 47) segment = 'EI02';
//   else if (ageGroupMin <= 71) segment = 'EI03';
//
// DEPOIS:
//   // EI01 – Bebês: 0 a 18 meses (Berçário I e II)
//   // EI02 – Crianças Bem Pequenas: 19 a 47 meses (Maternal I e II — inclui turmas com ageGroupMin=12 que são Maternal)
//   // EI03 – Crianças Pequenas: 48 a 71 meses (Primeiro Período)
//   //
//   // REGRA: turmas nomeadas "Maternal" com ageGroupMin até 24 meses entram em EI02
//   // pois o Maternal 1 abrange 1a7m–2a11m (19–35 meses) e é Crianças Bem Pequenas.
//   // A fronteira é 18 meses (1a6m) para EI01 conforme BNCC/Currículo DF.
//   if (ageGroupMin <= 18) segment = 'EI01';
//   else if (ageGroupMin <= 47) segment = 'EI02';
//   else if (ageGroupMin <= 71) segment = 'EI03';
//
// NOTA: A regra de ageGroupMin já está CORRETA (18/47/71).
// O problema real é que alguns seeds têm ageGroupMin=12 para turmas Maternal.
// A correção é nos seeds (patch 3).
