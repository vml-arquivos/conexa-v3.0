/**
 * seed-cocris-units.ts
 * Script idempotente para popular as unidades COCRIS a partir de units.json.
 *
 * Estratégia:
 * 1. Ler units.json do mesmo diretório
 * 2. Descobrir mantenedoraId da COCRIS (por nome ou fallback por usuário)
 * 3. Upsert por (mantenedoraId, code) — idempotente, pode rodar N vezes
 * 4. Só atualiza campos vazios no banco (preserva edições manuais)
 *
 * Execução:
 *   docker exec -it <container_api> npx ts-node prisma/seed-cocris-units.ts
 *
 * NÃO cria migrations. NÃO altera schema.prisma.
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface UnitJson {
  code: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}

async function main() {
  console.log('🚀 seed-cocris-units.ts — iniciando...\n');

  // 1. Ler units.json
  const jsonPath = path.join(__dirname, 'units.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Arquivo não encontrado: ${jsonPath}`);
    process.exit(1);
  }
  const units: UnitJson[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`📄 units.json carregado: ${units.length} unidades`);
  units.forEach((u) => console.log(`   - [${u.code}] ${u.name}`));

  // 2. Descobrir mantenedoraId
  let mantenedoraId: string | null = null;

  // Preferência: buscar mantenedora com nome contendo "COCRIS"
  const mantenedoras = await prisma.mantenedora.findMany({
    where: { name: { contains: 'COCRIS', mode: 'insensitive' } },
    select: { id: true, name: true },
  });

  if (mantenedoras.length > 0) {
    mantenedoraId = mantenedoras[0].id;
    console.log(`\n✅ Mantenedora encontrada: ${mantenedoras[0].name} (${mantenedoraId})`);
  } else {
    console.log('\n⚠️  Mantenedora "COCRIS" não encontrada por nome. Tentando fallback...');

    // Fallback: usar mantenedoraId do usuário pedagogico@cocris.org.br
    const user = await prisma.user.findUnique({
      where: { email: 'pedagogico@cocris.org.br' },
      select: { mantenedoraId: true, email: true },
    });

    if (user?.mantenedoraId) {
      mantenedoraId = user.mantenedoraId;
      console.log(`✅ MantenedoraId obtido via usuário ${user.email}: ${mantenedoraId}`);
    } else {
      // Fallback final: primeira mantenedora ativa
      const primeira = await prisma.mantenedora.findFirst({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
      });
      if (primeira) {
        mantenedoraId = primeira.id;
        console.log(`⚠️  Usando primeira mantenedora ativa: ${primeira.name} (${mantenedoraId})`);
      } else {
        console.error('❌ Nenhuma mantenedora encontrada no banco. Abortando.');
        process.exit(1);
      }
    }
  }

  // 3. Diagnóstico: unidades existentes
  const existentes = await prisma.unit.findMany({
    where: { mantenedoraId },
    select: { id: true, code: true, name: true, city: true, state: true },
    orderBy: { name: 'asc' },
  });
  console.log(`\n📊 Unidades existentes no banco (mantenedoraId=${mantenedoraId}): ${existentes.length}`);
  existentes.forEach((u) => console.log(`   - [${u.code}] ${u.name} — ${u.city ?? '?'}/${u.state ?? '?'}`));

  // 4. Upsert idempotente
  console.log('\n🔄 Executando upsert...\n');
  let created = 0;
  let updated = 0;

  for (const unitData of units) {
    const code = unitData.code.trim().toUpperCase();

    const existing = await prisma.unit.findFirst({
      where: { code, mantenedoraId },
    });

    if (existing) {
      // Atualizar apenas campos que estão vazios no banco (preserva edições manuais)
      // Exceção: name e isActive são sempre atualizados para garantir consistência
      await prisma.unit.update({
        where: { id: existing.id },
        data: {
          name: unitData.name,
          isActive: unitData.isActive ?? true,
          // Só preenche campos vazios
          address: existing.address || unitData.address || undefined,
          city: existing.city || unitData.city || undefined,
          state: existing.state || unitData.state || undefined,
          email: existing.email || unitData.email || undefined,
          phone: existing.phone || unitData.phone || undefined,
        },
      });
      console.log(`🔄 Atualizada: [${code}] ${unitData.name}`);
      updated++;
    } else {
      await prisma.unit.create({
        data: {
          mantenedoraId,
          code,
          name: unitData.name,
          address: unitData.address,
          city: unitData.city,
          state: unitData.state,
          email: unitData.email,
          phone: unitData.phone,
          isActive: unitData.isActive ?? true,
        },
      });
      console.log(`✅ Criada:    [${code}] ${unitData.name}`);
      created++;
    }
  }

  // 5. Validação final
  const finais = await prisma.unit.findMany({
    where: { mantenedoraId },
    select: { id: true, code: true, name: true, city: true, state: true, isActive: true },
    orderBy: { name: 'asc' },
  });

  console.log(`\n📊 Resumo:`);
  console.log(`   - Criadas:     ${created}`);
  console.log(`   - Atualizadas: ${updated}`);
  console.log(`   - Total final: ${finais.length} unidades\n`);
  console.log('📋 Estado final do banco:');
  finais.forEach((u) =>
    console.log(`   - [${u.code}] ${u.name} — ${u.city ?? '?'}/${u.state ?? '?'} (ativa=${u.isActive}) [${u.id}]`),
  );

  if (finais.length >= units.length) {
    console.log(`\n✅ Seed concluído! ${finais.length} unidades presentes no banco.`);
  } else {
    console.warn(`\n⚠️  Apenas ${finais.length} unidades encontradas (esperado: ${units.length}). Verifique o banco.`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
