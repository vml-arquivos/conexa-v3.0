// ============================================================================
// DADOS ESTÁTICOS DAS UNIDADES COCRIS
// Usado como fallback quando o banco de dados não estiver disponível
// ============================================================================

export interface UnitData {
  id: number;
  unitCode: string;
  unitName: string;
  slug: string;
  mantenedoraName: string;
  city: string;
  state: string;
  addressPublic: string;
  phonePublic: string;
  emailPublic: string;
  websiteUrl: string;
  description: string;
  imageUrl: string;
  latitude: string;
  longitude: string;
  active: boolean;
}

export const UNITS_STATIC: UnitData[] = [
  {
    id: 1,
    unitCode: 'ARARA',
    unitName: 'CEPI Arara Canindé',
    slug: 'cepi-arara-caninde',
    mantenedoraName: 'Associação Beneficente Coração de Cristo - COCRIS',
    city: 'Brasília',
    state: 'DF',
    addressPublic: 'Quadra 205 Conjunto 5-A Lote 4, Recanto das Emas, CEP 72620050',
    phonePublic: '(61) 3578-5162',
    emailPublic: 'cepiarara@cocris.org',
    websiteUrl: 'https://cocris.org',
    description:
      'Centro de Educação para a Infância com foco no desenvolvimento integral das crianças de 0 a 5 anos. Oferecemos educação de qualidade, alimentação balanceada e um ambiente seguro e acolhedor para o pleno desenvolvimento infantil.',
    imageUrl: '/images/units/cepi-arara-caninde.jpg',
    latitude: '-15.9161',
    longitude: '-48.0641',
    active: true,
  },
  {
    id: 2,
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
    description:
      'Centro de Educação para a Infância dedicado ao desenvolvimento integral das crianças através de atividades pedagógicas, recreativas e culturais. Oferecemos ambiente acolhedor e seguro.',
    imageUrl: '/images/units/cepi-beija-flor.jpg',
    latitude: '-15.8965',
    longitude: '-48.0598',
    active: true,
  },
  {
    id: 3,
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
    description:
      'Centro de Educação para a Infância localizado em Brazlândia, oferecendo educação de qualidade com foco no desenvolvimento cognitivo, motor e socioemocional das crianças.',
    imageUrl: '/images/units/cepi-flamboyant.jpg',
    latitude: '-15.6679',
    longitude: '-48.2046',
    active: true,
  },
  {
    id: 4,
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
    description:
      'Unidade de educação infantil comprometida com o acolhimento e aprendizagem das crianças, promovendo valores de respeito, solidariedade e cidadania.',
    imageUrl: '/images/units/cepi-sabia-do-campo.jpg',
    latitude: '-15.9135',
    longitude: '-48.0625',
    active: true,
  },
  {
    id: 5,
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
    description:
      'Creche que oferece educação infantil de excelência com foco no desenvolvimento integral das crianças. Contamos com berçário, lactário, refeitório e espaços pedagógicos modernos.',
    imageUrl: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663355075489/OmfvivHnmCuwMTfw.jpg',
    latitude: '-15.9089',
    longitude: '-48.0614',
    active: true,
  },
  {
    id: 6,
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
    description:
      'Centro de convivência e educação infantil focado no desenvolvimento social e educacional das crianças, promovendo inclusão e aprendizagem significativa.',
    imageUrl: '/images/units/creche-pelicano.jpg',
    latitude: '-15.9098',
    longitude: '-48.0602',
    active: true,
  },
  {
    id: 7,
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
    description:
      'A Creche Rouxinol, localizada na região de Água Quente, é gerida pela Associação Filantrópica Pai Abraão em parceria com a COCRIS. Inaugurada em 2024, a unidade oferece educação infantil de qualidade com infraestrutura moderna e equipe pedagógica qualificada, atendendo crianças em tempo integral (7h às 17h) com alimentação balanceada e atividades educacionais diversificadas. Conta com berçário, lactário, refeitório, parquinho, sala de leitura, sala multimídia e quadra coberta.',
    imageUrl: '/images/units/creche-rouxinol.jpg',
    latitude: '-15.8267',
    longitude: '-48.0336',
    active: true,
  },
];

export function getUnitBySlug(slug: string): UnitData | undefined {
  return UNITS_STATIC.find((u) => u.slug === slug);
}

export function getActiveUnits(): UnitData[] {
  return UNITS_STATIC.filter((u) => u.active);
}
