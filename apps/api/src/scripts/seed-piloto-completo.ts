/**
 * Seed COMPLETO e IDEMPOTENTE do ambiente PILOTO.
 *
 * - Cria uma Mantenedora PRÓPRIA do piloto (isolada): usuários de nível
 *   Mantenedora/Coordenação Geral/Manutenção do piloto NÃO enxergam dados reais.
 * - 2 unidades, 4 turmas, 40 crianças com cenários variados
 *   (alergias, laudos, medicação, restrições, frequência irregular).
 * - Usuários de TODOS os papéis (exceto DEVELOPER).
 * - Frequência, diário, observações de desenvolvimento, planejamentos,
 *   cardápio de 4 semanas, pedidos de compra e ordens de serviço de exemplo.
 *
 * Pode ser executado quantas vezes quiser: nunca duplica e nunca toca outra mantenedora.
 *
 * Uso:   npm run seed:piloto        (senha padrão Teste@123, ou PILOTO_SENHA=...)
 */
import { PrismaClient, RoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ensureRoles } from './_ensure-roles';

export {};

const prisma = new PrismaClient();
const TAG = 'seed-piloto';
const MANT_ID = 'mant-piloto-001';
const DOMINIO = 'piloto.conexa.test';

const UNIDADES = [
  { id: 'unit-piloto-a', code: 'PILOTO-A', name: 'CEPI PILOTO A — Ambiente de Testes' },
  { id: 'unit-piloto-b', code: 'PILOTO-B', name: 'CEPI PILOTO B — Ambiente de Testes' },
];

const TURMAS = [
  { key: 'A1', unit: 0, code: 'PIL-A-BERCARIO', name: 'Berçário II — Piloto A', min: 12, max: 23 },
  { key: 'A2', unit: 0, code: 'PIL-A-MATERNAL', name: 'Maternal II — Piloto A', min: 36, max: 47 },
  { key: 'B1', unit: 1, code: 'PIL-B-MATERNAL', name: 'Maternal I — Piloto B', min: 24, max: 35 },
  { key: 'B2', unit: 1, code: 'PIL-B-PRE', name: 'Pré I — Piloto B', min: 48, max: 59 },
];

type U = { key: string; nome: [string, string]; role: RoleType; unit?: number; turma?: string };
const USUARIOS: U[] = [
  { key: 'mantenedora', nome: ['ADMIN', 'MANTENEDORA PILOTO'], role: RoleType.MANTENEDORA_ADMIN },
  { key: 'financeiro', nome: ['FINANCEIRO', 'PILOTO'], role: RoleType.MANTENEDORA_FINANCEIRO },
  { key: 'coordgeral', nome: ['COORD. GERAL', 'PILOTO'], role: RoleType.STAFF_CENTRAL_PEDAGOGICO },
  { key: 'psicologia', nome: ['PSICÓLOGA', 'PILOTO'], role: RoleType.STAFF_CENTRAL_PSICOLOGIA },
  { key: 'manutencao1', nome: ['MANUTENÇÃO', 'PILOTO 1'], role: RoleType.MANUTENCAO_EXECUTOR },
  { key: 'manutencao2', nome: ['MANUTENÇÃO', 'PILOTO 2'], role: RoleType.MANUTENCAO_EXECUTOR },
  ...[0, 1].flatMap((i): U[] => {
    const L = i === 0 ? 'a' : 'b';
    const N = L.toUpperCase();
    return [
      { key: `diretor.${L}`, nome: ['DIRETORA', `PILOTO ${N}`], role: RoleType.UNIDADE_DIRETOR, unit: i },
      { key: `coordenador.${L}`, nome: ['COORDENADORA', `PILOTO ${N}`], role: RoleType.UNIDADE_COORDENADOR_PEDAGOGICO, unit: i },
      { key: `secretaria.${L}`, nome: ['SECRETÁRIA', `PILOTO ${N}`], role: RoleType.UNIDADE_ADMINISTRATIVO, unit: i },
      { key: `nutricionista.${L}`, nome: ['NUTRICIONISTA', `PILOTO ${N}`], role: RoleType.UNIDADE_NUTRICIONISTA, unit: i },
    ];
  }),
  { key: 'professor.a1', nome: ['PROFESSORA', 'PILOTO A1'], role: RoleType.PROFESSOR, unit: 0, turma: 'A1' },
  { key: 'professor.a2', nome: ['PROFESSORA', 'PILOTO A2'], role: RoleType.PROFESSOR, unit: 0, turma: 'A2' },
  { key: 'professor.b1', nome: ['PROFESSORA', 'PILOTO B1'], role: RoleType.PROFESSOR, unit: 1, turma: 'B1' },
  { key: 'professor.b2', nome: ['PROFESSOR', 'PILOTO B2'], role: RoleType.PROFESSOR, unit: 1, turma: 'B2' },
];
const email = (key: string) => `${key}@${DOMINIO}`;

const NOMES_F = ['SOFIA', 'ALICE', 'HELENA', 'VALENTINA', 'LAURA', 'ISABELLA', 'MANUELA', 'HEITOR', 'LUNA', 'CECÍLIA', 'LÍVIA', 'MARIA CLARA', 'AURORA', 'ANA JÚLIA', 'BEATRIZ', 'MÍRIAN', 'ESTER', 'LORENA', 'CLARA', 'ELOÁ'];
const NOMES_M = ['MIGUEL', 'ARTHUR', 'GAEL', 'THÉO', 'HEITOR', 'RAVI', 'DAVI', 'BERNARDO', 'NOAH', 'GABRIEL', 'SAMUEL', 'BENÍCIO', 'LORENZO', 'ENZO', 'JOÃO MIGUEL', 'LUCAS', 'PEDRO', 'ANTÔNIO', 'ISAAC', 'OTÁVIO'];
const SOBRENOMES = ['SANTOS', 'OLIVEIRA', 'SOUZA', 'LIMA', 'PEREIRA', 'COSTA', 'RODRIGUES', 'ALMEIDA', 'NASCIMENTO', 'ARAÚJO', 'CARVALHO', 'GOMES', 'MARTINS', 'ROCHA', 'RIBEIRO', 'BARBOSA', 'MOREIRA', 'CARDOSO', 'TEIXEIRA', 'MONTEIRO'];

/** Cenários por posição (0–9) dentro de cada turma — garante variedade em todas as turmas. */
type Cenario = {
  allergies?: string; medicalConditions?: string; medicationNeeds?: string;
  laudo?: { tipo: string; cid: string; desc: string };
  restricao?: { type: 'ALERGIA' | 'INTOLERANCIA' | 'MEDICA' | 'RELIGIOSA' | 'PREFERENCIA'; name: string; severity: string; proibidos: string; permitidos?: string };
  faltas?: number; // quantidade de faltas nos últimos dias
};
const CENARIOS: Cenario[] = [
  {}, // 0 criança sem particularidades
  { allergies: 'Leite de vaca (APLV)', restricao: { type: 'ALERGIA', name: 'Alergia à proteína do leite (APLV)', severity: 'severa', proibidos: 'leite, queijo, iogurte, manteiga, requeijão, chocolate ao leite', permitidos: 'bebida vegetal, frutas, legumes' } },
  { allergies: 'Amendoim e castanhas', restricao: { type: 'ALERGIA', name: 'Alergia a amendoim/oleaginosas', severity: 'severa', proibidos: 'amendoim, paçoca, castanhas, nozes, pasta de amendoim' } },
  { restricao: { type: 'INTOLERANCIA', name: 'Intolerância à lactose', severity: 'moderada', proibidos: 'leite comum, doce de leite', permitidos: 'leite sem lactose' } },
  { restricao: { type: 'INTOLERANCIA', name: 'Doença celíaca', severity: 'severa', proibidos: 'trigo, aveia, cevada, centeio, biscoitos e massas comuns', permitidos: 'arroz, milho, tapioca, mandioca' } },
  { laudo: { tipo: 'TEA', cid: 'F84.0', desc: 'Transtorno do Espectro Autista — nível 1 de suporte. Sensibilidade a ruídos; rotina visual ajuda.' }, medicalConditions: 'Seletividade alimentar', faltas: 1 },
  { laudo: { tipo: 'TDAH', cid: 'F90.0', desc: 'Déficit de atenção/hiperatividade em acompanhamento neuropediátrico.' }, medicationNeeds: 'Metilfenidato 5mg — 1 comprimido às 8h (administrado pela família em casa)' },
  { allergies: 'Ovo', medicalConditions: 'Asma leve', medicationNeeds: 'Bombinha (salbutamol) se crise — autorização dos pais anexada', restricao: { type: 'ALERGIA', name: 'Alergia ao ovo', severity: 'moderada', proibidos: 'ovo, maionese, bolos e massas com ovo' } },
  { laudo: { tipo: 'Deficiência intelectual (Síndrome de Down)', cid: 'Q90.9', desc: 'Síndrome de Down. Acompanha fonoaudiologia e fisioterapia semanais.' }, restricao: { type: 'MEDICA', name: 'Dieta de textura pastosa (disfagia leve)', severity: 'moderada', proibidos: 'alimentos duros, secos e farelentos' }, faltas: 2 },
  { restricao: { type: 'RELIGIOSA', name: 'Sem carne suína', severity: 'leve', proibidos: 'carne de porco, embutidos de porco', permitidos: 'frango, bovina, peixe, ovos' }, faltas: 4 }, // faltoso → alerta busca ativa
];

const TIPOS_DIARIO = ['ATIVIDADE_PEDAGOGICA', 'REFEICAO', 'HIGIENE', 'SONO', 'COMPORTAMENTO', 'DESENVOLVIMENTO', 'SAUDE', 'FAMILIA', 'OBSERVACAO'] as const;
const TEXTO_DIARIO: Record<string, [string, string]> = {
  ATIVIDADE_PEDAGOGICA: ['Roda de conversa e brincadeira dirigida', 'Participou da roda, cantou com o grupo e explorou os materiais propostos.'],
  REFEICAO: ['Almoço', 'Aceitou bem a refeição, comeu a maior parte do prato e pediu repetição de fruta.'],
  HIGIENE: ['Troca e higiene', 'Higiene realizada com tranquilidade; lavou as mãos com auxílio antes do lanche.'],
  SONO: ['Soneca da tarde', 'Dormiu cerca de 1h30, acordou calmo.'],
  COMPORTAMENTO: ['Interação com colegas', 'Brincou em grupo, dividiu brinquedos com mediação da professora.'],
  DESENVOLVIMENTO: ['Marco de desenvolvimento', 'Demonstrou avanço na coordenação motora fina ao encaixar peças pequenas.'],
  SAUDE: ['Cuidado com a saúde', 'Sem queixas. Hidratação oferecida ao longo do dia.'],
  FAMILIA: ['Recado da família', 'Mãe informou que a criança dormiu mal à noite; atenção ao cansaço.'],
  OBSERVACAO: ['Observação da professora', 'Mostrou interesse especial por livros de histórias e pediu para ouvir de novo.'],
};

const ITENS_CARDAPIO: Record<string, string[][]> = {
  CAFE_MANHA: [['Leite com cacau', 'Pão com ovo mexido'], ['Mingau de aveia', 'Banana'], ['Vitamina de frutas', 'Biscoito de polvilho'], ['Iogurte natural', 'Pão integral com queijo'], ['Suco de laranja', 'Bolo de cenoura']],
  ALMOCO: [['Arroz', 'Feijão', 'Frango desfiado', 'Cenoura refogada'], ['Arroz', 'Feijão', 'Carne moída', 'Abobrinha'], ['Macarrão ao sugo', 'Frango', 'Salada de alface'], ['Arroz', 'Feijão', 'Peixe assado', 'Purê de batata'], ['Arroz', 'Feijão', 'Ovo mexido', 'Brócolis']],
  LANCHE_TARDE: [['Mamão', 'Bolacha de arroz'], ['Pão com requeijão', 'Suco de goiaba'], ['Salada de frutas'], ['Canjica', 'Maçã'], ['Sopa de legumes']],
};
const DIAS = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'] as const;

// ───────── utilidades de data ─────────
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const noon = (s: string) => new Date(`${s}T12:00:00.000Z`);
function segunda(d: Date): Date {
  const x = new Date(d); const w = x.getUTCDay(); // 0=dom
  return addDays(x, w === 0 ? -6 : 1 - w);
}
function diasUteisRecentes(n: number, hoje: Date): string[] {
  const out: string[] = []; let d = new Date(hoje);
  while (out.length < n) { const w = d.getUTCDay(); if (w !== 0 && w !== 6) out.push(iso(d)); d = addDays(d, -1); }
  return out.reverse();
}

async function main() {
  const senha = process.env.PILOTO_SENHA || 'Teste@123';
  const hash = await bcrypt.hash(senha, 10);
  const hoje = new Date();
  console.log('🧪 Seed PILOTO completo — mantenedora isolada:', MANT_ID);

  // 1. Mantenedora, papéis, unidades
  await prisma.mantenedora.upsert({
    where: { id: MANT_ID },
    create: { id: MANT_ID, name: 'ASSOCIAÇÃO PILOTO (Ambiente de Testes)', cnpj: '00.000.000/0001-91', email: 'contato@piloto.conexa.test', city: 'Brasília', state: 'DF', plan: 'enterprise', maxUnits: 10, maxUsers: 200, isActive: true, createdBy: TAG },
    update: {},
  });
  const roleMap = await ensureRoles(prisma as any, MANT_ID);

  const unitIds: string[] = [];
  for (const u of UNIDADES) {
    const unit = await prisma.unit.upsert({
      where: { id: u.id },
      create: { id: u.id, mantenedoraId: MANT_ID, name: u.name, code: u.code, address: 'Ambiente de testes — não é uma unidade real', city: 'Brasília', state: 'DF', isActive: true, createdBy: TAG },
      update: {},
    });
    unitIds.push(unit.id);
  }

  // 2. Turmas
  const turmaId: Record<string, string> = {};
  for (const t of TURMAS) {
    const c = await prisma.classroom.upsert({
      where: { unitId_code: { unitId: unitIds[t.unit], code: t.code } },
      create: { unitId: unitIds[t.unit], name: t.name, code: t.code, ageGroupMin: t.min, ageGroupMax: t.max, capacity: 15, isActive: true, createdBy: TAG },
      update: {},
    });
    turmaId[t.key] = c.id;
  }

  // 3. Usuários
  const userId: Record<string, string> = {};
  for (const u of USUARIOS) {
    const roleId = roleMap.get(u.role);
    if (!roleId) throw new Error(`Role não encontrado: ${u.role}`);
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    const user = await prisma.user.upsert({
      where: { email: email(u.key) },
      create: { mantenedoraId: MANT_ID, unitId: u.unit !== undefined ? unitIds[u.unit] : null, email: email(u.key), password: hash, firstName: u.nome[0], lastName: u.nome[1], status: 'ATIVO', createdBy: TAG, updatedBy: TAG } as any,
      update: { password: hash },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      create: { userId: user.id, roleId, scopeLevel: role!.level, isActive: true },
      update: { isActive: true },
    });
    userId[u.key] = user.id;
    if (u.turma) {
      await prisma.classroomTeacher.upsert({
        where: { classroomId_teacherId: { classroomId: turmaId[u.turma], teacherId: user.id } },
        create: { classroomId: turmaId[u.turma], teacherId: user.id, role: 'MAIN', isActive: true },
        update: {},
      });
    }
  }
  console.log(`  ✅ ${USUARIOS.length} usuários`);

  // 4. Crianças (10 por turma) + matrícula + restrições
  const criancas: { id: string; turma: string; unit: number; cen: Cenario }[] = [];
  let seq = 0;
  for (const t of TURMAS) {
    for (let p = 0; p < 10; p++) {
      seq++;
      const fem = p % 2 === 0;
      const nome = (fem ? NOMES_F : NOMES_M)[(seq * 3) % 20];
      const sob = `${SOBRENOMES[(seq * 7) % 20]} ${SOBRENOMES[(seq * 11 + 3) % 20]}`;
      const cen = CENARIOS[p];
      const ageMonths = (t.min + t.max) / 2;
      const nasc = new Date(hoje.getTime() - ageMonths * 30.4 * 86400000 - (seq % 5) * 20 * 86400000);
      const cpf = `998.${String(Math.floor(seq / 10)).padStart(3, '0')}.${String(seq).padStart(3, '0')}-${String(seq % 100).padStart(2, '0')}`;
      const code = `PIL-${String(seq).padStart(3, '0')}`;
      const data: any = {
        mantenedoraId: MANT_ID, unitId: unitIds[t.unit], firstName: nome, lastName: sob, cpf, codigoAluno: code,
        dateOfBirth: nasc, gender: fem ? 'FEMININO' : 'MASCULINO',
        nomeMae: `MÃE DE ${nome} ${sob.split(' ')[0]}`, emergencyContactPhone: `(61) 99999-${String(1000 + seq)}`,
        allergies: cen.allergies ?? null, medicalConditions: cen.medicalConditions ?? null, medicationNeeds: cen.medicationNeeds ?? null,
        laudado: !!cen.laudo, tipoLaudo: cen.laudo?.tipo ?? null, cid: cen.laudo?.cid ?? null, descricaoLaudo: cen.laudo?.desc ?? null,
        isActive: true, createdBy: TAG, updatedBy: TAG,
      };
      const child = await prisma.child.upsert({ where: { cpf }, create: data, update: {} });
      await prisma.enrollment.upsert({
        where: { childId_classroomId: { childId: child.id, classroomId: turmaId[t.key] } },
        create: { childId: child.id, classroomId: turmaId[t.key], enrollmentDate: addDays(hoje, -120), status: 'ATIVA' as any, createdBy: TAG },
        update: {},
      });
      if (cen.restricao) {
        const r = cen.restricao;
        const ex = await prisma.dietaryRestriction.findFirst({ where: { childId: child.id, name: r.name } });
        if (!ex) {
          await prisma.dietaryRestriction.create({ data: { childId: child.id, type: r.type as any, name: r.name, severity: r.severity, forbiddenFoods: r.proibidos, allowedFoods: r.permitidos ?? null, isActive: true, createdBy: TAG } });
        }
      }
      criancas.push({ id: child.id, turma: t.key, unit: t.unit, cen });
    }
  }
  console.log(`  ✅ ${criancas.length} crianças`);

  // 5. Frequência — últimos 15 dias úteis
  const dias = diasUteisRecentes(15, hoje);
  let freq = 0;
  for (const c of criancas) {
    const prof = userId[`professor.${c.turma.toLowerCase()}`];
    const faltaDias = new Set(dias.slice(-(c.cen.faltas ?? 0)));
    for (const dia of dias) {
      const date = noon(dia);
      const ex = await prisma.attendance.findFirst({ where: { classroomId: turmaId[c.turma], childId: c.id, date } });
      if (ex) continue;
      const falta = faltaDias.has(dia);
      const status = falta ? ((c.cen.faltas ?? 0) >= 4 ? 'AUSENTE' : (dia.endsWith('3') ? 'JUSTIFICADO' : 'AUSENTE')) : (dia.endsWith('7') ? 'ATRASO' : 'PRESENTE');
      await prisma.attendance.create({
        data: { mantenedoraId: MANT_ID, unitId: unitIds[c.unit], classroomId: turmaId[c.turma], childId: c.id, date, status: status as any, justification: status === 'JUSTIFICADO' ? 'Consulta médica (atestado entregue)' : null, recordedBy: prof },
      });
      freq++;
    }
  }
  console.log(`  ✅ ${freq} registros de frequência`);

  // 6. Diário de bordo — últimos 10 dias úteis, 1 evento por criança por dia (tipos rotativos)
  let diario = 0;
  for (const [di, dia] of dias.slice(-10).entries()) {
    for (const [ci, c] of criancas.entries()) {
      const tipo = TIPOS_DIARIO[(di + ci) % TIPOS_DIARIO.length];
      const [titulo, desc] = TEXTO_DIARIO[tipo];
      const eventDate = noon(dia);
      const ex = await prisma.diaryEvent.findFirst({ where: { childId: c.id, classroomId: turmaId[c.turma], type: tipo as any, eventDate } });
      if (ex) continue;
      await prisma.diaryEvent.create({
        data: {
          mantenedoraId: MANT_ID, unitId: unitIds[c.unit], classroomId: turmaId[c.turma], childId: c.id,
          type: tipo as any, title: titulo, description: desc,
          developmentNotes: tipo === 'DESENVOLVIMENTO' ? 'Avanço observado em coordenação motora fina.' : null,
          behaviorNotes: tipo === 'COMPORTAMENTO' ? 'Interagiu bem com o grupo.' : null,
          eventDate, status: 'PUBLICADO', tags: [], mediaUrls: [], createdBy: userId[`professor.${c.turma.toLowerCase()}`],
        } as any,
      });
      diario++;
    }
  }
  console.log(`  ✅ ${diario} eventos de diário`);

  // 7. Observações de desenvolvimento (2 por criança)
  let obs = 0;
  for (const c of criancas) {
    const ex = await prisma.developmentObservation.count({ where: { childId: c.id, createdBy: userId[`professor.${c.turma.toLowerCase()}`] } });
    if (ex > 0) continue;
    const prof = userId[`professor.${c.turma.toLowerCase()}`];
    const laudado = !!c.cen.laudo;
    await prisma.developmentObservation.createMany({
      data: [
        { childId: c.id, classroomId: turmaId[c.turma], createdBy: prof, category: 'GERAL', date: addDays(hoje, -20), socialInteraction: laudado ? 'Prefere brincar sozinho; aproxima-se de um colega de referência.' : 'Interage bem e busca os colegas.', emotionalState: 'Estável, com boa adaptação à rotina.', motorSkills: 'Corre, sobe e desce degraus com segurança.', languageSkills: laudado ? 'Vocabulário em construção; usa gestos para se comunicar.' : 'Fala frases de 3 a 4 palavras.', learningProgress: 'Acompanha as propostas com interesse.', indicadores: {} },
        { childId: c.id, classroomId: turmaId[c.turma], createdBy: prof, category: 'ACOMPANHAMENTO', date: addDays(hoje, -5), behaviorDescription: laudado ? 'Apresentou desorganização em momentos de troca de atividade; rotina visual ajudou.' : 'Participativo nas atividades dirigidas.', healthNotes: c.cen.allergies ? `Atenção: ${c.cen.allergies}.` : null, dietaryNotes: c.cen.restricao ? `Restrição: ${c.cen.restricao.name}.` : null, developmentAlerts: laudado ? 'Acompanhar evolução com a coordenação e a psicologia.' : null, recommendations: laudado ? 'Manter plano de adaptação individual.' : null, indicadores: {} },
      ] as any,
    });
    obs += 2;
  }
  console.log(`  ✅ ${obs} observações de desenvolvimento`);

  // 8. Planejamentos — 4 semanas por turma (APROVADO) + 1 em RASCUNHO para teste de fluxo
  let planos = 0;
  const seg0 = segunda(hoje);
  for (const t of TURMAS) {
    for (let w = -2; w <= 1; w++) {
      const ini = addDays(seg0, w * 7); const fim = addDays(ini, 4);
      const title = `Semana ${iso(ini)} — ${t.name}`;
      const ex = await prisma.planning.findFirst({ where: { classroomId: turmaId[t.key], title } });
      if (ex) continue;
      await prisma.planning.create({
        data: {
          mantenedoraId: MANT_ID, unitId: unitIds[t.unit], classroomId: turmaId[t.key], title,
          description: 'Planejamento semanal do piloto', type: 'SEMANAL' as any,
          startDate: new Date(`${iso(ini)}T08:00:00.000Z`), endDate: new Date(`${iso(fim)}T17:00:00.000Z`),
          objectives: 'Explorar o ambiente, interagir com os colegas e ampliar a comunicação.',
          activities: 'Segunda: roda de conversa. Terça: pintura. Quarta: circuito motor. Quinta: história. Sexta: música e movimento.',
          evaluation: 'Observação e registro no diário de bordo.',
          status: (w === 1 ? 'RASCUNHO' : 'APROVADO') as any,
          professorId: userId[`professor.${t.key.toLowerCase()}`], createdBy: userId[`professor.${t.key.toLowerCase()}`],
        } as any,
      });
      planos++;
    }
  }
  console.log(`  ✅ ${planos} planejamentos`);

  // 9. Cardápio — 4 semanas por unidade (nutricionista), publicado
  let cards = 0;
  for (const [ui, uid] of unitIds.entries()) {
    const nutri = userId[`nutricionista.${ui === 0 ? 'a' : 'b'}`];
    for (let w = -1; w <= 2; w++) {
      const semana = iso(addDays(seg0, w * 7));
      if (await prisma.cardapio.findFirst({ where: { unitId: uid, semana } })) continue;
      const cardapio = await prisma.cardapio.create({
        data: { mantenedoraId: MANT_ID, unitId: uid, semana, titulo: `Cardápio da semana ${semana}`, observacoes: 'Cardápio do piloto — verificar restrições alimentares por criança.', publicado: true, createdBy: nutri },
      });
      for (const [di, dia] of DIAS.entries()) {
        for (const tipo of ['CAFE_MANHA', 'ALMOCO', 'LANCHE_TARDE'] as const) {
          const ref = await prisma.cardapioRefeicao.create({ data: { cardapioId: cardapio.id, diaSemana: dia as any, tipoRefeicao: tipo as any } });
          const itens = ITENS_CARDAPIO[tipo][(di + w + 5) % 5];
          await prisma.cardapioItem.createMany({ data: itens.map((nome) => ({ refeicaoId: ref.id, nome, quantidade: 1 as any, unidade: 'porção' })) });
        }
      }
      cards++;
    }
  }
  console.log(`  ✅ ${cards} cardápios semanais`);

  // 10. Pedidos de compra (1 por unidade no mês)
  const mes = iso(hoje).slice(0, 7);
  let pedidos = 0;
  for (const [ui, uid] of unitIds.entries()) {
    if (await prisma.pedidoCompra.findFirst({ where: { unitId: uid, mesReferencia: mes } })) continue;
    const p = await prisma.pedidoCompra.create({
      data: { mantenedoraId: MANT_ID, unitId: uid, mesReferencia: mes, status: (ui === 0 ? 'ENVIADO' : 'APROVADO') as any, observacoes: 'Pedido de exemplo do piloto', consolidadoPor: userId.financeiro, enviadoEm: addDays(hoje, -3) },
    });
    await prisma.itemPedidoCompra.createMany({
      data: [
        { pedidoCompraId: p.id, categoria: 'PEDAGOGICO' as any, descricao: 'Papel sulfite A4 (resma)', quantidade: 20, unidadeMedida: 'resma', custoEstimado: 28.9 },
        { pedidoCompraId: p.id, categoria: 'HIGIENE' as any, descricao: 'Fralda descartável M (pacote)', quantidade: 40, unidadeMedida: 'pacote', custoEstimado: 32.5 },
        { pedidoCompraId: p.id, categoria: 'LIMPEZA' as any, descricao: 'Desinfetante 2L', quantidade: 12, unidadeMedida: 'un', custoEstimado: 9.9 },
      ],
    });
    pedidos++;
  }
  console.log(`  ✅ ${pedidos} pedidos de compra`);

  // 11. Ordens de serviço de exemplo (cobrem todos os estados do fluxo)
  const OS: { title: string; unit: number; cat: string; prio: string; loc: string; status: string; dueIn?: number; result?: string; eval?: string; by: string; assignee?: string; reopened?: number }[] = [
    { title: 'Lâmpada queimada no corredor', unit: 0, cat: 'ELETRICA', prio: 'BAIXA', loc: 'Corredor — bloco A', status: 'ABERTA', by: 'diretor.a' },
    { title: 'Vazamento na torneira do banheiro infantil', unit: 0, cat: 'HIDRAULICA', prio: 'ALTA', loc: 'Banheiro Maternal II', status: 'ACEITA', dueIn: 2, by: 'diretor.a', assignee: 'manutencao1' },
    { title: 'Portão do pátio travando', unit: 1, cat: 'PORTAS_JANELAS', prio: 'URGENTE', loc: 'Pátio externo', status: 'EM_EXECUCAO', dueIn: -1, by: 'diretor.b', assignee: 'manutencao2' },
    { title: 'Troca de tomada na sala de Berçário', unit: 0, cat: 'ELETRICA', prio: 'ALTA', loc: 'Sala Berçário II', status: 'AGUARDANDO_AVALIACAO', dueIn: 1, result: 'EXECUTADO', by: 'coordenador.a', assignee: 'manutencao1' },
    { title: 'Pintura da parede do refeitório', unit: 1, cat: 'ALVENARIA_PINTURA', prio: 'MEDIA', loc: 'Refeitório', status: 'ENCERRADA', dueIn: -5, result: 'EXECUTADO', eval: 'EXECUTADO', by: 'diretor.b', assignee: 'manutencao2' },
    { title: 'Conserto do armário da sala de Pré I', unit: 1, cat: 'MOBILIARIO', prio: 'MEDIA', loc: 'Sala Pré I', status: 'ENCERRADA', dueIn: -8, result: 'PARCIAL', eval: 'PARCIAL', by: 'diretor.b', assignee: 'manutencao1', reopened: 1 },
    { title: 'Internet instável na secretaria', unit: 0, cat: 'TI_REDES', prio: 'MEDIA', loc: 'Secretaria', status: 'CANCELADA', by: 'secretaria.a' },
  ];
  let oss = 0;
  for (const o of OS) {
    if (await prisma.serviceOrder.findFirst({ where: { mantenedoraId: MANT_ID, title: o.title } })) continue;
    const st = o.status;
    const aceita = st !== 'ABERTA' && st !== 'CANCELADA';
    const order = await prisma.serviceOrder.create({
      data: {
        mantenedoraId: MANT_ID, unitId: unitIds[o.unit], title: o.title, description: `${o.title}. Chamado de exemplo do piloto para teste do fluxo de manutenção.`,
        category: o.cat as any, priority: o.prio as any, location: o.loc, status: st as any,
        requestedById: userId[o.by], assignedToId: o.assignee ? userId[o.assignee] : null,
        dueDate: o.dueIn !== undefined ? addDays(hoje, o.dueIn) : null,
        acceptedAt: aceita ? addDays(hoje, -3) : null,
        startedAt: ['EM_EXECUCAO', 'AGUARDANDO_AVALIACAO', 'ENCERRADA'].includes(st) ? addDays(hoje, -2) : null,
        completedAt: ['AGUARDANDO_AVALIACAO', 'ENCERRADA'].includes(st) ? addDays(hoje, -1) : null,
        closedAt: st === 'ENCERRADA' ? addDays(hoje, -1) : null,
        executionReport: o.result ? 'Serviço realizado conforme solicitado; material do estoque da unidade.' : null,
        executionResult: (o.result as any) ?? null,
        evaluationResult: (o.eval as any) ?? null,
        evaluationNotes: o.eval ? (o.eval === 'PARCIAL' ? 'Falta ajustar a porta do armário.' : 'Ficou ótimo, obrigado!') : null,
        evaluatedById: o.eval ? userId[o.by] : null, evaluatedAt: o.eval ? addDays(hoje, -1) : null,
        reopenCount: o.reopened ?? 0,
      },
    });
    const ev = (type: string, from: string | null, to: string | null, author: string, message?: string) =>
      ({ orderId: order.id, type, fromStatus: from as any, toStatus: to as any, authorId: author, message: message ?? null });
    const eventos = [ev('CRIADA', null, 'ABERTA', userId[o.by])];
    if (aceita) eventos.push(ev('ACEITA', 'ABERTA', 'ACEITA', userId[o.assignee!], 'Prazo definido.'));
    if (['EM_EXECUCAO', 'AGUARDANDO_AVALIACAO', 'ENCERRADA'].includes(st)) eventos.push(ev('INICIADA', 'ACEITA', 'EM_EXECUCAO', userId[o.assignee!]));
    if (['AGUARDANDO_AVALIACAO', 'ENCERRADA'].includes(st)) eventos.push(ev('CONCLUIDA', 'EM_EXECUCAO', 'AGUARDANDO_AVALIACAO', userId[o.assignee!], 'Relatório enviado.'));
    if (st === 'ENCERRADA') eventos.push(ev('ENCERRADA', 'AGUARDANDO_AVALIACAO', 'ENCERRADA', userId[o.by], 'Avaliação registrada.'));
    if (st === 'CANCELADA') eventos.push(ev('CANCELADA', 'ABERTA', 'CANCELADA', userId[o.by], 'Resolvido pela equipe de TI externa.'));
    await prisma.serviceOrderEvent.createMany({ data: eventos });
    oss++;
  }
  console.log(`  ✅ ${oss} ordens de serviço de exemplo`);

  // 11b. Requisições de material (por turma, em vários estados) — professor pede, coordenação/mantenedora aprovam
  const MATS: { t: string; title: string; type: string; status: string; qty: number; prio: string; itens: [string, number, string][] }[] = [
    { t: 'A1', title: 'Material pedagógico — tintas e pincéis', type: 'PEDAGOGICO', status: 'SOLICITADO', qty: 30, prio: 'normal', itens: [['Tinta guache 250ml', 12, 'un'], ['Pincel chato nº 12', 18, 'un']] },
    { t: 'A2', title: 'Higiene — fraldas e lenços umedecidos', type: 'HIGIENE', status: 'APROVADO', qty: 60, prio: 'alta', itens: [['Fralda descartável G', 40, 'pacote'], ['Lenço umedecido', 20, 'pacote']] },
    { t: 'B1', title: 'Livros infantis para o cantinho de leitura', type: 'PEDAGOGICO', status: 'ENTREGUE', qty: 15, prio: 'baixa', itens: [['Livro de histórias ilustrado', 15, 'un']] },
    { t: 'B2', title: 'Material de limpeza da sala', type: 'LIMPEZA', status: 'RASCUNHO', qty: 10, prio: 'normal', itens: [['Álcool 70% 1L', 6, 'un'], ['Pano multiuso', 4, 'un']] },
    { t: 'B2', title: 'Massinha e jogos de encaixe', type: 'PEDAGOGICO', status: 'REJEITADO', qty: 20, prio: 'normal', itens: [['Massinha de modelar', 20, 'caixa']] },
  ];
  let mats = 0;
  for (const [i, m] of MATS.entries()) {
    const unitIdx = TURMAS.find((x) => x.key === m.t)!.unit;
    const code = `PIL-REQ-${String(i + 1).padStart(3, '0')}`;
    if (await prisma.materialRequest.findFirst({ where: { unitId: unitIds[unitIdx], code } })) continue;
    const r = await prisma.materialRequest.create({
      data: {
        mantenedoraId: MANT_ID, unitId: unitIds[unitIdx], classroomId: turmaId[m.t], code, title: m.title,
        description: 'Requisição de exemplo do piloto', type: m.type as any, quantity: m.qty, estimatedCost: m.qty * 12.5,
        status: m.status as any, priority: m.prio, requestedDate: addDays(hoje, -6), requiredDate: addDays(hoje, 10),
        approvedDate: ['APROVADO', 'ENTREGUE'].includes(m.status) ? addDays(hoje, -4) : null,
        deliveredDate: m.status === 'ENTREGUE' ? addDays(hoje, -1) : null,
        approvedBy: ['APROVADO', 'ENTREGUE'].includes(m.status) ? userId[`coordenador.${unitIdx === 0 ? 'a' : 'b'}`] : null,
        createdBy: userId[`professor.${m.t.toLowerCase()}`],
      } as any,
    });
    await prisma.materialRequestItem.createMany({ data: m.itens.map(([productName, quantity, unit]) => ({ materialRequestId: r.id, productName, quantity, unit })) });
    mats++;
  }
  console.log(`  ✅ ${mats} requisições de material`);

  // 11c. Relatórios individuais (RDIC) — 1 por criança, em estados variados
  const periodo = `${hoje.getUTCFullYear()}-${hoje.getUTCMonth() < 6 ? '1S' : '2S'}`;
  const ESTADOS = ['PUBLICADO', 'APROVADO', 'EM_REVISAO', 'RASCUNHO', 'DEVOLVIDO'];
  let rdics = 0;
  for (const [i, c] of criancas.entries()) {
    if (await prisma.developmentReport.findFirst({ where: { childId: c.id, period: periodo } })) continue;
    const st = ESTADOS[i % ESTADOS.length];
    const laudado = !!c.cen.laudo;
    await prisma.developmentReport.create({
      data: {
        childId: c.id, authorId: userId[`professor.${c.turma.toLowerCase()}`], classroomId: turmaId[c.turma], unitId: unitIds[c.unit], period: periodo,
        content: `Relatório individual do período. ${laudado ? 'A criança segue com plano de adaptação individual e acompanhamento da coordenação e da psicologia. ' : ''}Participa das propostas com interesse, interage com o grupo e demonstra avanços na comunicação, na coordenação motora e na autonomia nos momentos de alimentação e higiene.${c.cen.allergies ? ` Atenção à alergia: ${c.cen.allergies}.` : ''}`,
        status: st as any, publishedAt: st === 'PUBLICADO' ? addDays(hoje, -2) : null,
      } as any,
    });
    rdics++;
  }
  console.log(`  ✅ ${rdics} relatórios individuais (RDIC)`);

  // 12. Resumo de acessos
  console.log('\n📋 LOGINS DO PILOTO  (senha: ' + (process.env.PILOTO_SENHA ? '<PILOTO_SENHA>' : 'Teste@123') + ')');
  for (const u of USUARIOS) console.log(`  ${email(u.key).padEnd(44)} ${u.role}`);
  console.log('\n🎉 Piloto pronto. Dados isolados na mantenedora', MANT_ID);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
