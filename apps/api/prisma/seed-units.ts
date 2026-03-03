/**
 * seed-units.ts
 * Script NÃO-DESTRUTIVO para garantir que as 6 unidades COCRIS existam no banco.
 *
 * ⚠️  NÃO EXECUTAR AUTOMATICAMENTE — rodar manualmente apenas se necessário.
 *
 * Estratégia:
 * 1. Buscar mantenedora com nome contendo "COCRIS" (case-insensitive)
 * 2. Fallback: usar mantenedoraId do usuário pedagogico@cocris.org.br
 * 3. Upsert das 6 unidades por code (idempotente — pode rodar N vezes)
 *
 * NÃO cria migrations. NÃO altera schema.prisma.
 *
 * Como executar (em produção):
 *   cd apps/api
 *   npx ts-node -r tsconfig-paths/register prisma/seed-units.ts
 *   # ou via docker:
 *   docker exec -it <container_api> npx ts-node prisma/seed-units.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UnitSeed {
  code: string;
  name: string;
  city: string;
  state: string;
  address: string;
  email: string;
  phone: string;
}

const COCRIS_UNITS: UnitSeed[] = [
  {
    code: 'ARARA-CAN',
    name: 'CEPI Arara Canindé',
    city: 'Recanto das Emas',
    state: 'DF',
    address: 'Recanto das Emas, DF',
    email: 'arara.caninde@cocris.org.br',
    phone: '(61) 3201-1001',
  },
  {
    code: 'BEIJA-FLO',
    name: 'CEPI Beija-Flor',
    city: 'Recanto das Emas',
    state: 'DF',
    address: 'Recanto das Emas, DF',
    email: 'beija.flor@cocris.org.br',
    phone: '(61) 3201-1002',
  },
  {
    code: 'SABIA-CAM',
    name: 'CEPI Sabiá do Campo',
    city: 'Recanto das Emas',
    state: 'DF',
    address: 'Recanto das Emas, DF',
    email: 'sabia.campo@cocris.org.br',
    phone: '(61) 3201-1003',
  },
  {
    code: 'CORAC-CRI',
    name: 'Escola de Educação Infantil Coração de Cristo (Creche CoCris)',
    city: 'Recanto das Emas',
    state: 'DF',
    address: 'Recanto das Emas, DF',
    email: 'coracao.cristo@cocris.org.br',
    phone: '(61) 3201-1004',
  },
  {
    code: 'PELICANO',
    name: 'Pelicano – Centro de Convivência e Educação Infantil (Creche Pelicano)',
    city: 'Recanto das Emas',
    state: 'DF',
    address: 'Recanto das Emas, DF',
    email: 'pelicano@cocris.org.br',
    phone: '(61) 3201-1005',
  },
  {
    code: 'FLAMBOY',
    name: 'CEPI Flamboyant',
    city: 'Brazlândia',
    state: 'DF',
    address: 'Brazlândia, DF',
    email: 'flamboyant@cocris.org.br',
    phone: '(61) 3201-1006',
  },
];

async function main() {
  console.log('🚀 Iniciando seed idempotente das unidades COCRIS...\n');

  // 1. Descobrir mantenedoraId
  let mantenedoraId: string | null = null;

  const mantenedoras = await prisma.mantenedora.findMany({
    where: { name: { contains: 'COCRIS', mode: 'insensitive' } },
    select: { id: true, name: true },
  });

  if (mantenedoras.length > 0) {
    mantenedoraId = mantenedoras[0].id;
    console.log(`✅ Mantenedora encontrada: ${mantenedoras[0].name} (${mantenedoraId})`);
  } else {
    console.log('⚠️  Mantenedora "COCRIS" não encontrada por nome. Tentando fallback...');
    const user = await prisma.user.findUnique({
      where: { email: 'pedagogico@cocris.org.br' },
      select: { mantenedoraId: true, email: true },
    });
    if (user?.mantenedoraId) {
      mantenedoraId = user.mantenedoraId;
      console.log(`✅ MantenedoraId via usuário ${user.email}: ${mantenedoraId}`);
    } else {
      console.error('❌ Não foi possível determinar o mantenedoraId. Abortando.');
      process.exit(1);
    }
  }

  // 2. Diagnóstico: listar unidades existentes
  const unidadesExistentes = await prisma.unit.findMany({
    where: { mantenedoraId },
    select: { id: true, code: true, name: true },
    orderBy: { name: 'asc' },
  });
  console.log(`\n📊 Unidades existentes: ${unidadesExistentes.length}`);
  unidadesExistentes.forEach((u) => console.log(`   - [${u.code}] ${u.name}`));

  // 3. Upsert das 6 unidades (por code + mantenedoraId)
  console.log('\n🔄 Executando upsert das 6 unidades COCRIS...\n');
  let created = 0;
  let updated = 0;

  for (const unitData of COCRIS_UNITS) {
    const existing = await prisma.unit.findFirst({
      where: { code: unitData.code, mantenedoraId },
    });

    if (existing) {
      await prisma.unit.update({
        where: { id: existing.id },
        data: {
          name: unitData.name,
          city: unitData.city,
          state: unitData.state,
          address: unitData.address,
          email: unitData.email,
          phone: unitData.phone,
          isActive: true,
        },
      });
      console.log(`🔄 Atualizada: [${unitData.code}] ${unitData.name}`);
      updated++;
    } else {
      await prisma.unit.create({
        data: {
          code: unitData.code,
          name: unitData.name,
          city: unitData.city,
          state: unitData.state,
          address: unitData.address,
          email: unitData.email,
          phone: unitData.phone,
          mantenedoraId,
          isActive: true,
        },
      });
      console.log(`✅ Criada: [${unitData.code}] ${unitData.name}`);
      created++;
    }
  }

  // 4. Resumo final
  const unidadesFinais = await prisma.unit.findMany({
    where: { mantenedoraId },
    select: { id: true, code: true, name: true, city: true, state: true },
    orderBy: { name: 'asc' },
  });

  console.log(`\n📊 Resumo:`);
  console.log(`   - Criadas:     ${created}`);
  console.log(`   - Atualizadas: ${updated}`);
  console.log(`   - Total final: ${unidadesFinais.length} unidades\n`);
  unidadesFinais.forEach((u) => console.log(`   - [${u.code}] ${u.name} — ${u.city}/${u.state}`));

  if (unidadesFinais.length >= 6) {
    console.log('\n✅ Seed concluído! As 6 unidades COCRIS estão presentes no banco.');
  } else {
    console.warn(`\n⚠️  Apenas ${unidadesFinais.length} unidades. Verifique o banco.`);
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
