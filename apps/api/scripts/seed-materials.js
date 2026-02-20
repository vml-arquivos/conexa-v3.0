const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Populando catálogo de materiais...\n');

  // Ler materiais do JSON
  const materialsPath = path.join(__dirname, '../datasets/materiais_seed.json');
  const materials = JSON.parse(fs.readFileSync(materialsPath, 'utf8'));

  console.log(`📦 ${materials.length} materiais encontrados\n`);

  // Limpar materiais existentes
  await prisma.material.deleteMany({});
  console.log('✅ Materiais existentes removidos\n');

  // Criar materiais
  let pedagogicos = 0;
  let higiene = 0;

  for (const material of materials) {
    await prisma.material.create({
      data: {
        id: `mat-${material.codigo.toLowerCase()}`,
        code: material.codigo,
        name: material.nome,
        description: material.descricao || null,
        category: material.categoria,
        unit: material.unidade,
        referencePrice: material.valor_referencia || 0.0,
        isActive: true
      }
    });

    if (material.categoria === 'PEDAGOGICO') {
      pedagogicos++;
    } else if (material.categoria === 'HIGIENE') {
      higiene++;
    }
  }

  console.log('✅ Materiais criados:');
  console.log(`   - ${pedagogicos} materiais pedagógicos`);
  console.log(`   - ${higiene} materiais de higiene`);
  console.log(`   - ${materials.length} total\n`);

  // Mostrar alguns exemplos
  console.log('📋 Exemplos de materiais cadastrados:\n');
  
  const pedagogicosExemplos = await prisma.material.findMany({
    where: { category: 'PEDAGOGICO' },
    take: 5
  });

  console.log('PEDAGÓGICOS:');
  pedagogicosExemplos.forEach(m => {
    console.log(`  ${m.code} - ${m.name} (${m.unit}) - R$ ${m.referencePrice.toFixed(2)}`);
  });

  const higieneExemplos = await prisma.material.findMany({
    where: { category: 'HIGIENE' },
    take: 5
  });

  console.log('\nHIGIENE:');
  higieneExemplos.forEach(m => {
    console.log(`  ${m.code} - ${m.name} (${m.unit}) - R$ ${m.referencePrice.toFixed(2)}`);
  });

  console.log('\n🎉 Seed de materiais concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao popular materiais:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
