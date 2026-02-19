import mysql from 'mysql2/promise';

const unitsData = [
  {
    unitCode: 'ARARA',
    unitName: 'CEPI Arara Canindé',
    slug: 'cepi-arara-caninde',
    mantenedoraName: 'Associação Beneficente Coração de Cristo - COCRIS',
    city: 'Brasília',
    state: 'DF',
    addressPublic: 'Quadra 307 Conjunto 11 nº 1, Recanto das Emas, CEP 72621412',
    phonePublic: '(61) 3575-4363',
    emailPublic: 'aracaninde@gmail.com',
    websiteUrl: 'https://cocris.org',
    description: 'Centro de Educação para a Infância que oferece educação infantil de qualidade no Recanto das Emas, com infraestrutura completa e equipe pedagógica qualificada. Atendemos crianças de 0 a 5 anos em tempo integral.',
    imageUrl: '/images/units/cepi-arara-caninde.jpg',
    latitude: '-15.9161',
    longitude: '-48.0641',
    active: true
  },
  {
    unitCode: 'BEIJAFLOR',
    unitName: 'CEPI Beija Flor',
    slug: 'cepi-beija-flor',
    mantenedoraName: 'Associação Beneficente Coração de Cristo - COCRIS',
    city: 'Brasília',
    state: 'DF',
    addressPublic: 'Quadra 107 Conjunto 8-A, Recanto das Emas, CEP 72601310',
    phonePublic: '(61) 3081-7602 / (61) 99671-3129',
    emailPublic: 'beijaflorcreremas@gmail.com',
    websiteUrl: 'https://cocris.org',
    description: 'Centro de Educação para a Infância dedicado ao desenvolvimento integral das crianças através de atividades pedagógicas, recreativas e culturais. Oferecemos ambiente acolhedor e seguro.',
    imageUrl: '/images/units/cepi-beija-flor.jpg',
    latitude: '-15.8965',
    longitude: '-48.0598',
    active: true
  },
  {
    unitCode: 'FLAMBOYANT',
    unitName: 'CEPI Flamboyant',
    slug: 'cepi-flamboyant',
    mantenedoraName: 'Associação Beneficente Coração de Cristo - COCRIS',
    city: 'Brasília',
    state: 'DF',
    addressPublic: 'Área Especial 1 Setor Sul, Brazlândia, CEP 72715610',
    phonePublic: '(61) 3081-5118',
    emailPublic: 'flamboyantbraz@gmail.com',
    websiteUrl: 'https://cocris.org',
    description: 'Centro de Educação para a Infância localizado em Brazlândia, oferecendo educação de qualidade com foco no desenvolvimento cognitivo, motor e socioemocional das crianças.',
    imageUrl: '/images/units/cepi-flamboyant.jpg',
    latitude: '-15.6679',
    longitude: '-48.2046',
    active: true
  },
  {
    unitCode: 'SABIA',
    unitName: 'CEPI Sabiá do Campo',
    slug: 'cepi-sabia-do-campo',
    mantenedoraName: 'Associação Beneficente Coração de Cristo - COCRIS',
    city: 'Brasília',
    state: 'DF',
    addressPublic: 'Quadra 305 Conjunto 2-A Lote 1, Recanto das Emas, CEP 72621200',
    phonePublic: '(61) 3578-5160',
    emailPublic: 'cepisabiadocampo@hotmail.com',
    websiteUrl: 'https://cocris.org',
    description: 'Unidade de educação infantil comprometida com o acolhimento e aprendizagem das crianças, promovendo valores de respeito, solidariedade e cidadania.',
    imageUrl: '/images/units/cepi-sabia-do-campo.jpg',
    latitude: '-15.9135',
    longitude: '-48.0625',
    active: true
  },
  {
    unitCode: 'COCRIS',
    unitName: 'Creche COCRIS',
    slug: 'creche-cocris',
    mantenedoraName: 'Associação Beneficente Coração de Cristo - COCRIS',
    city: 'Brasília',
    state: 'DF',
    addressPublic: 'Quadra 301 Avenida Recanto das Emas, Lote 26, Recanto das Emas, CEP 72620214',
    phonePublic: '(61) 3575-4119',
    emailPublic: 'crechemovimento@gmail.com',
    websiteUrl: 'https://cocris.org',
    description: 'Creche que oferece educação infantil de excelência com foco no desenvolvimento integral das crianças. Contamos com berçário, lactário, refeitório e espaços pedagógicos modernos.',
    imageUrl: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663355075489/OmfvivHnmCuwMTfw.jpg',
    latitude: '-15.9089',
    longitude: '-48.0614',
    active: true
  },
  {
    unitCode: 'PELICANO',
    unitName: 'Creche Pelicano',
    slug: 'creche-pelicano',
    mantenedoraName: 'Associação Beneficente Coração de Cristo - COCRIS',
    city: 'Brasília',
    state: 'DF',
    addressPublic: 'Condomínio Residencial São Francisco, Recanto das Emas, CEP 72620200',
    phonePublic: '(61) 3575-4125 / (61) 3559-2784',
    emailPublic: 'crechepelicano@gmail.com',
    websiteUrl: 'https://cocris.org',
    description: 'Centro de convivência e educação infantil focado no desenvolvimento social e educacional das crianças, promovendo inclusão e aprendizagem significativa.',
    imageUrl: '/images/units/creche-pelicano.jpg',
    latitude: '-15.9098',
    longitude: '-48.0602',
    active: true
  },
  {
    unitCode: 'ROUXINOL',
    unitName: 'Creche Rouxinol',
    slug: 'creche-rouxinol',
    mantenedoraName: 'Associação Filantrópica Pai Abraão / COCRIS',
    city: 'Brasília',
    state: 'DF',
    addressPublic: 'Rodovia DF-280, Água Quente, Brasília - DF',
    phonePublic: '(61) 2099-8400',
    emailPublic: 'rouxinol@cocris.org',
    websiteUrl: 'https://cocris.org',
    description: 'A Creche Rouxinol, localizada na região de Água Quente, é gerida pela Associação Filantrópica Pai Abraão em parceria com a COCRIS. Inaugurada em 2024, a unidade oferece educação infantil de qualidade com infraestrutura moderna e equipe pedagógica qualificada, atendendo crianças em tempo integral (7h às 17h) com alimentação balanceada e atividades educacionais diversificadas. Conta com berçário, lactário, refeitório, parquinho, sala de leitura, sala multimídia e quadra coberta.',
    imageUrl: '/images/units/creche-rouxinol.jpg',
    latitude: '-15.8267',
    longitude: '-48.0336',
    active: true
  }
];

async function seedUnits() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  console.log('🌱 Iniciando seed das unidades...');

   try {
    // Atualizar ou inserir unidades
    for (const unit of unitsData) {
      // Tentar atualizar primeiro
      const [result] = await connection.execute(
        `UPDATE units SET 
          unitCode = ?, unitName = ?, mantenedoraName = ?, city = ?, state = ?, 
          addressPublic = ?, phonePublic = ?, emailPublic = ?, websiteUrl = ?, 
          description = ?, imageUrl = ?, latitude = ?, longitude = ?, active = ?, updatedAt = NOW()
         WHERE slug = ?`,
        [
          unit.unitCode, unit.unitName, unit.mantenedoraName, unit.city, unit.state,
          unit.addressPublic, unit.phonePublic, unit.emailPublic, unit.websiteUrl,
          unit.description, unit.imageUrl, unit.latitude, unit.longitude, unit.active,
          unit.slug
        ]
      );
      
      // Se não atualizou nada, inserir
      if (result.affectedRows === 0) {
        await connection.execute(
          `INSERT INTO units (unitCode, unitName, slug, mantenedoraName, city, state, addressPublic, phonePublic, emailPublic, websiteUrl, description, imageUrl, latitude, longitude, active, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            unit.unitCode, unit.unitName, unit.slug, unit.mantenedoraName, unit.city, unit.state,
            unit.addressPublic, unit.phonePublic, unit.emailPublic, unit.websiteUrl,
            unit.description, unit.imageUrl, unit.latitude, unit.longitude, unit.active
          ]
        );
        console.log(`✅ ${unit.unitName} inserida`);
      } else {
        console.log(`✅ ${unit.unitName} atualizada`);
      }
    }

    console.log('\n🎉 Seed concluído com sucesso! 7 unidades inseridas.');
  } catch (error) {
    console.error('❌ Erro ao fazer seed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedUnits();
