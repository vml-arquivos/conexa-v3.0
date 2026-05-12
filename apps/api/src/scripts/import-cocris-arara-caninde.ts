/**
 * ============================================================================
 * IMPORTADOR DRY-RUN — COCRIS Pedagógico
 * Unidade: CEPI Arara Canindé (extensível a outras unidades via --unit-code)
 * ============================================================================
 *
 * OBJETIVO DESTA VERSÃO:
 *  - Validar planilhas e gerar relatório seguro antes de qualquer escrita.
 *  - NÃO grava no banco.
 *  - NÃO cria usuários/senhas.
 *  - NÃO altera profissionais.
 *  - NÃO cria/atualiza alunos.
 *  - NÃO faz migration.
 *  - NÃO altera RBAC.
 *
 * APPLY:
 *  - Bloqueado intencionalmente nesta versão.
 *  - Para liberar apply, criar PR separado com transação global, backup recente e aprovação explícita.
 *
 * USO:
 *   pnpm --filter api ts-node src/scripts/import-cocris-arara-caninde.ts \
 *     --students-file tmp/imports/cocris/arara-caninde/alunos-amostra.xlsx \
 *     --staff-file tmp/imports/cocris/arara-caninde/profissionais-amostra.xlsx \
 *     --unit-code ARARA-CANINDE \
 *     --dry-run \
 *     --report-out tmp/imports/cocris/arara-caninde/dry-run-report.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { PrismaClient, RoleType } from '@prisma/client';

const prisma = new PrismaClient({ log: [] });

interface ImportArgs {
  studentsFile?: string;
  staffFile?: string;
  unitId?: string;
  unitCode?: string;
  dryRun: boolean;
  apply: boolean;
  createMissingClassrooms: boolean;
  reportOut?: string;
}

interface RowIssue {
  linha: number;
  campo: string;
  valor: unknown;
  motivo: string;
  severidade?: 'INFO' | 'AVISO' | 'BLOQUEANTE';
}

interface StudentRow {
  linha: number;
  codAluno?: string;
  inscricao?: string;
  nome?: string;
  sexo?: string;
  nasc?: Date;
  cpf?: string;
  raca?: string;
  peso?: string;
  tipagem?: string;
  turma?: string;
  professora?: string;
  nomeMae?: string;
  nomePai?: string;
  intolerantes?: string;
  laudado?: boolean;
  genitor?: boolean;
  usoImagem?: boolean;
  transporteEscolar?: boolean;
  nomeTransporte?: string;
  nis?: string;
  responsavelNome?: string;
  responsavelCpf?: string;
  responsavelCelMae?: string;
  responsavelCelPai?: string;
  responsavelTelTrabalho?: string;
  pessoaAutorizada?: string;
  pessoaAutorizadaParentesco?: string;
  pessoaAutorizadaTelefone?: string;
}

interface StaffRow {
  linha: number;
  funcao?: string;
  nome?: string;
  telefone?: string;
  email?: string;
}

interface ExistingChild {
  id: string;
  unitId: string;
  mantenedoraId: string;
  cpf: string | null;
  codigoAluno: string | null;
  inscricao: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
}

interface ImportReport {
  geradoEm: string;
  modo: 'dry-run';
  applyBloqueado: boolean;
  unidade: { id?: string; code?: string; nome?: string; mantenedoraId?: string } | null;
  alunos: {
    lidos: number;
    validos: number;
    comErro: number;
    seriam_criados: number;
    seriam_atualizados: number;
    ignorados: number;
    cpfDuplicadoNaPlanilha: number;
    cpfConflitoOutraUnidade: number;
    turmasEncontradas: string[];
    turmasAusentes: string[];
  };
  profissionais: {
    lidos: number;
    validos: number;
    comErro: number;
    seriam_criados: number;
    seriam_atualizados: number;
    conflitosOutraUnidade: number;
    ignorados: number;
  };
  inconsistencias: RowIssue[];
  camposSemMapeamento: string[];
  errosBloqueantes: string[];
  detalhes: {
    alunos: Array<{
      linha: number;
      chave: string;
      acao: 'CRIAR' | 'ATUALIZAR' | 'IGNORAR' | 'ERRO' | 'CONFLITO';
      motivo?: string;
      turma?: string;
      childId?: string;
    }>;
    profissionais: Array<{
      linha: number;
      chave: string;
      acao: 'CRIAR' | 'ATUALIZAR' | 'IGNORAR' | 'ERRO' | 'CONFLITO';
      motivo?: string;
      roleType?: string;
      userId?: string;
    }>;
  };
}

// ─── Normalização ────────────────────────────────────────────────────────────

function normalizarTexto(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s === '' ? undefined : s;
}

function normalizarHeader(v: unknown): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizarCPF(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const s = String(v).replace(/\D/g, '').trim();
  if (!s || /^0+$/.test(s)) return undefined;
  const cpf = s.padStart(11, '0').slice(-11);
  return cpf.length === 11 ? cpf : undefined;
}

function normalizarTelefone(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const s = String(v).replace(/\D/g, '').trim();
  if (!s || /^0+$/.test(s) || s.length > 11) return undefined;
  return s;
}

function normalizarEmail(v: unknown): string | undefined {
  const s = normalizarTexto(v)?.toLowerCase();
  return s || undefined;
}

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizarBoolean(v: unknown): boolean | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const s = String(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (['SIM', 'S', 'TRUE', '1', 'YES', 'X'].includes(s)) return true;
  if (['NAO', 'N', 'Ñ', 'FALSE', '0', 'NO'].includes(s)) return false;
  return undefined;
}

function normalizarData(v: unknown): Date | undefined {
  if (v === null || v === undefined || v === '') return undefined;

  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return undefined;
    const ano = v.getFullYear();
    if (ano < 1900 || ano > 2100) return undefined;
    return v;
  }

  if (typeof v === 'number') {
    if (v < 1 || v > 100000) return undefined;
    const data = XLSX.SSF.parse_date_code(v);
    if (!data) return undefined;
    return new Date(data.y, data.m - 1, data.d);
  }

  if (typeof v === 'string') {
    const s = v.trim();
    const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (br) {
      const dia = Number(br[1]);
      const mes = Number(br[2]);
      let ano = Number(br[3]);
      if (ano < 100) ano += 2000;
      const d = new Date(ano, mes - 1, dia);
      if (!Number.isNaN(d.getTime())) return d;
    }

    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return undefined;
}

function chaveNormalizada(s: string | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function getByHeader(headers: string[], row: unknown[], names: string[]): unknown {
  const normalizedNames = names.map(normalizarHeader);
  const idx = headers.findIndex((h) => normalizedNames.includes(h));
  return idx >= 0 ? row[idx] : undefined;
}

function getByIndex(row: unknown[], idx: number): unknown {
  return row[idx] ?? undefined;
}

// ─── Mapeamento função → RoleType ────────────────────────────────────────────

const FUNCAO_PARA_ROLE: Record<string, RoleType> = {
  DIRETOR: RoleType.UNIDADE_DIRETOR,
  DIRETORA: RoleType.UNIDADE_DIRETOR,
  COORDENADOR: RoleType.UNIDADE_COORDENADOR_PEDAGOGICO,
  COORDENADORA: RoleType.UNIDADE_COORDENADOR_PEDAGOGICO,
  'COORDENADOR PEDAGOGICO': RoleType.UNIDADE_COORDENADOR_PEDAGOGICO,
  'COORDENADORA PEDAGOGICA': RoleType.UNIDADE_COORDENADOR_PEDAGOGICO,
  NUTRICIONISTA: RoleType.UNIDADE_NUTRICIONISTA,
  SECRETARIO: RoleType.UNIDADE_ADMINISTRATIVO,
  SECRETARIA: RoleType.UNIDADE_ADMINISTRATIVO,
  ADMINISTRATIVO: RoleType.UNIDADE_ADMINISTRATIVO,
  PROFESSOR: RoleType.PROFESSOR,
  PROFESSORA: RoleType.PROFESSOR,
  AUXILIAR: RoleType.PROFESSOR_AUXILIAR,
  'PROFESSOR AUXILIAR': RoleType.PROFESSOR_AUXILIAR,
  'PROFESSORA AUXILIAR': RoleType.PROFESSOR_AUXILIAR,
};

function funcaoParaRoleType(funcao: string | undefined): RoleType | undefined {
  return FUNCAO_PARA_ROLE[chaveNormalizada(funcao)];
}

// ─── Leitura XLSX ────────────────────────────────────────────────────────────

function lerLinhas(filePath: string): { headers: string[]; rows: unknown[][] } {
  const wb = XLSX.readFile(filePath, { cellDates: false, raw: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as unknown[][];

  if (raw.length < 2) return { headers: [], rows: [] };

  return {
    headers: raw[0].map(normalizarHeader),
    rows: raw.slice(1),
  };
}

function lerPlanilhaAlunos(filePath: string): { rows: StudentRow[]; issues: RowIssue[]; camposSemDestino: string[] } {
  const { headers, rows: rawRows } = lerLinhas(filePath);
  const rows: StudentRow[] = [];
  const issues: RowIssue[] = [];

  const camposSemDestino = [
    'ENDERECO',
    'CEP',
    'NACIONALIDADE',
    'NATURALIDADE',
    'UF',
    'CENSO',
    'BENEF.',
    'N PESSOAS',
    'TRANSPORTE ESCOLAR',
    'NOME TRANSPORTE',
    'PESSOAS AUTORIZADAS PARA LIBERAR A CRIANCA',
    'PARENTESCO',
    'TELEFONE',
  ];

  rawRows.forEach((row, idx) => {
    const linha = idx + 2;

    const nomeRaw = getByHeader(headers, row, ['NOME']);
    const nome = normalizarTexto(nomeRaw);
    const codAluno = normalizarTexto(getByHeader(headers, row, ['COD. ALUNO', 'COD ALUNO']));
    const inscricao = normalizarTexto(getByHeader(headers, row, ['INSCRIÇÃO', 'INSCRICAO']));
    const nascRaw = getByHeader(headers, row, ['NASC', 'NASCIMENTO']);
    const nasc = normalizarData(nascRaw);
    const turma = normalizarTexto(getByHeader(headers, row, ['TURMA']));
    const cpf = normalizarCPF(getByHeader(headers, row, ['CPF']));

    if (!nome) {
      issues.push({ linha, campo: 'NOME', valor: nomeRaw, motivo: 'Aluno sem nome', severidade: 'BLOQUEANTE' });
    }
    if (!codAluno && !inscricao) {
      issues.push({
        linha,
        campo: 'COD. ALUNO / INSCRIÇÃO',
        valor: null,
        motivo: 'Aluno sem chave externa para idempotência',
        severidade: 'BLOQUEANTE',
      });
    }
    if (!nasc) {
      issues.push({ linha, campo: 'NASC', valor: nascRaw, motivo: 'Data de nascimento ausente ou inválida', severidade: 'BLOQUEANTE' });
    }
    if (!turma) {
      issues.push({ linha, campo: 'TURMA', valor: null, motivo: 'Turma vazia', severidade: 'BLOQUEANTE' });
    }

    rows.push({
      linha,
      codAluno,
      inscricao,
      nome,
      sexo: normalizarTexto(getByHeader(headers, row, ['SEXO'])),
      nasc,
      cpf,
      raca: normalizarTexto(getByHeader(headers, row, ['RAÇA', 'RACA'])),
      peso: normalizarTexto(getByHeader(headers, row, ['PESO'])),
      tipagem: normalizarTexto(getByHeader(headers, row, ['TIPAGEM SANGUINEA', 'TIPAGEM SANGUÍNEA'])),
      turma,
      professora: normalizarTexto(getByHeader(headers, row, ['PROFESSORA', 'PROFESSOR'])),
      nomeMae: normalizarTexto(getByHeader(headers, row, ['MÃE', 'MAE'])),
      nomePai: normalizarTexto(getByHeader(headers, row, ['PAI'])),
      intolerantes: normalizarTexto(getByHeader(headers, row, ['INTOLERANTES'])),
      laudado: normalizarBoolean(getByHeader(headers, row, ['LAUDADOS S / Ñ', 'LAUDADOS S / N', 'LAUDADOS'])),
      genitor: normalizarBoolean(getByHeader(headers, row, ['GENITOR S / Ñ', 'GENITOR S / N', 'GENITOR'])),
      usoImagem: normalizarBoolean(getByHeader(headers, row, ['USO IMAGEM', 'USO DE IMAGEM'])),
      transporteEscolar: normalizarBoolean(getByHeader(headers, row, ['TRANSPORTE ESCOLAR'])),
      nomeTransporte: normalizarTexto(getByHeader(headers, row, ['NOME TRANSPORTE'])),
      nis: normalizarTexto(getByHeader(headers, row, ['NIS'])),
      responsavelNome: normalizarTexto(getByHeader(headers, row, ['RESPONSÁVEL', 'RESPONSAVEL'])),
      // Na planilha real há cabeçalhos duplicados; manter fallback por índices observados no arquivo original.
      responsavelCpf: normalizarCPF(getByHeader(headers, row, ['CPF RESPONSÁVEL', 'CPF RESPONSAVEL']) ?? getByIndex(row, 41)),
      responsavelCelMae: normalizarTelefone(getByHeader(headers, row, ['CEL. MÃE', 'CEL MAE'])),
      responsavelCelPai: normalizarTelefone(getByHeader(headers, row, ['CEL. PAI', 'CEL PAI'])),
      responsavelTelTrabalho: normalizarTelefone(getByHeader(headers, row, ['TE. TRABALHO', 'TEL TRABALHO'])),
      pessoaAutorizada: normalizarTexto(getByHeader(headers, row, ['PESSOAS AUTORIZADAS PARA LIBERAR A CRIANÇA', 'PESSOAS AUTORIZADAS PARA LIBERAR A CRIANCA'])),
      pessoaAutorizadaParentesco: normalizarTexto(getByIndex(row, 54)),
      pessoaAutorizadaTelefone: normalizarTelefone(getByHeader(headers, row, ['TELEFONE'])),
    });
  });

  return { rows, issues, camposSemDestino };
}

function lerPlanilhaProfissionais(filePath: string): { rows: StaffRow[]; issues: RowIssue[] } {
  const { headers, rows: rawRows } = lerLinhas(filePath);
  const rows: StaffRow[] = [];
  const issues: RowIssue[] = [];

  rawRows.forEach((row, idx) => {
    const linha = idx + 2;
    const funcao = normalizarTexto(getByHeader(headers, row, ['FUNÇÃO', 'FUNCAO']));
    const nome = normalizarTexto(getByHeader(headers, row, ['NOME']));
    const telefone = normalizarTelefone(getByHeader(headers, row, ['TELEFONE']));
    const emailRaw = normalizarEmail(getByHeader(headers, row, ['E-MAIL', 'EMAIL']));
    const email = emailRaw && validarEmail(emailRaw) ? emailRaw : undefined;

    if (!nome) {
      issues.push({ linha, campo: 'NOME', valor: null, motivo: 'Profissional sem nome', severidade: 'BLOQUEANTE' });
    }
    if (!funcao) {
      issues.push({ linha, campo: 'FUNÇÃO', valor: null, motivo: 'Profissional sem função', severidade: 'BLOQUEANTE' });
    }
    if (emailRaw && !email) {
      issues.push({ linha, campo: 'E-MAIL', valor: emailRaw, motivo: 'E-mail inválido', severidade: 'BLOQUEANTE' });
    }

    rows.push({ linha, funcao, nome, telefone, email });
  });

  return { rows, issues };
}

// ─── Regras de validação com banco ───────────────────────────────────────────

async function resolverUnidade(args: ImportArgs, report: ImportReport) {
  if (args.unitId) {
    const unit = await prisma.unit.findUnique({
      where: { id: args.unitId },
      select: { id: true, name: true, code: true, mantenedoraId: true },
    });

    if (!unit) {
      report.errosBloqueantes.push(`Unidade não encontrada por id="${args.unitId}"`);
      return null;
    }

    return unit;
  }

  if (!args.unitCode) {
    report.errosBloqueantes.push('Informe --unit-id ou --unit-code.');
    return null;
  }

  const units = await prisma.unit.findMany({
    where: { code: { equals: args.unitCode, mode: 'insensitive' }, isActive: true },
    select: { id: true, name: true, code: true, mantenedoraId: true },
    orderBy: { name: 'asc' },
  });

  if (units.length === 0) {
    const existentes = await prisma.unit.findMany({
      where: { isActive: true },
      select: { name: true, code: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
    report.errosBloqueantes.push(
      `Unidade não encontrada por code="${args.unitCode}". Unidades ativas conhecidas: ` +
        existentes.map((u) => `${u.name} (${u.code})`).join('; ')
    );
    return null;
  }

  if (units.length > 1) {
    report.errosBloqueantes.push(
      `Ambiguidade: ${units.length} unidades encontradas com code="${args.unitCode}". Use --unit-id.`
    );
    return null;
  }

  return units[0];
}

function adicionarIssue(report: ImportReport, issue: RowIssue) {
  report.inconsistencias.push(issue);
  if (issue.severidade === 'BLOQUEANTE') {
    // Linha com bloqueio, mas não necessariamente bloqueia o dry-run inteiro.
  }
}

async function processarImportacao(args: ImportArgs): Promise<ImportReport> {
  const report: ImportReport = {
    geradoEm: new Date().toISOString(),
    modo: 'dry-run',
    applyBloqueado: true,
    unidade: null,
    alunos: {
      lidos: 0,
      validos: 0,
      comErro: 0,
      seriam_criados: 0,
      seriam_atualizados: 0,
      ignorados: 0,
      cpfDuplicadoNaPlanilha: 0,
      cpfConflitoOutraUnidade: 0,
      turmasEncontradas: [],
      turmasAusentes: [],
    },
    profissionais: {
      lidos: 0,
      validos: 0,
      comErro: 0,
      seriam_criados: 0,
      seriam_atualizados: 0,
      conflitosOutraUnidade: 0,
      ignorados: 0,
    },
    inconsistencias: [],
    camposSemMapeamento: [],
    errosBloqueantes: [],
    detalhes: { alunos: [], profissionais: [] },
  };

  if (args.apply) {
    report.errosBloqueantes.push(
      'APPLY BLOQUEADO nesta versão. Rode apenas --dry-run. Para apply, criar PR separado com transação global e aprovação explícita.'
    );
    return report;
  }

  const unit = await resolverUnidade(args, report);
  if (!unit) return report;

  report.unidade = {
    id: unit.id,
    code: unit.code,
    nome: unit.name,
    mantenedoraId: unit.mantenedoraId,
  };

  const classrooms = await prisma.classroom.findMany({
    where: { unitId: unit.id, isActive: true },
    select: { id: true, name: true, code: true },
  });

  const classroomsByName = new Map<string, { id: string; name: string; code: string }>();
  for (const c of classrooms) {
    classroomsByName.set(chaveNormalizada(c.name), c);
    classroomsByName.set(chaveNormalizada(c.code), c);
  }

  if (args.studentsFile) {
    const { rows, issues, camposSemDestino } = lerPlanilhaAlunos(args.studentsFile);
    report.alunos.lidos = rows.length;
    report.camposSemMapeamento.push(...camposSemDestino);
    report.inconsistencias.push(...issues);

    const cpfsPlanilha = new Map<string, number[]>();
    for (const row of rows) {
      if (!row.cpf) continue;
      const linhas = cpfsPlanilha.get(row.cpf) ?? [];
      linhas.push(row.linha);
      cpfsPlanilha.set(row.cpf, linhas);
    }

    for (const [cpf, linhas] of cpfsPlanilha.entries()) {
      if (linhas.length > 1) {
        report.alunos.cpfDuplicadoNaPlanilha += linhas.length;
        for (const linha of linhas) {
          adicionarIssue(report, {
            linha,
            campo: 'CPF',
            valor: cpf,
            motivo: `CPF duplicado na planilha nas linhas: ${linhas.join(', ')}`,
            severidade: 'BLOQUEANTE',
          });
        }
      }
    }

    const turmas = [...new Set(rows.map((r) => r.turma).filter(Boolean) as string[])];
    for (const turma of turmas) {
      const found = classroomsByName.get(chaveNormalizada(turma));
      if (found) report.alunos.turmasEncontradas.push(turma);
      else {
        report.alunos.turmasAusentes.push(turma);
        adicionarIssue(report, {
          linha: 0,
          campo: 'TURMA',
          valor: turma,
          motivo: `Turma não encontrada na unidade ${unit.name}`,
          severidade: 'BLOQUEANTE',
        });
      }
    }

    for (const row of rows) {
      const linhaIssues = report.inconsistencias.filter((i) => i.linha === row.linha && i.severidade === 'BLOQUEANTE');
      const turmaExiste = !!(row.turma && classroomsByName.get(chaveNormalizada(row.turma)));

      if (!row.nome || !row.nasc || (!row.codAluno && !row.inscricao) || !row.turma || !turmaExiste || linhaIssues.length > 0) {
        report.alunos.comErro++;
        report.detalhes.alunos.push({
          linha: row.linha,
          chave: `linha-${row.linha}`,
          acao: 'ERRO',
          motivo: linhaIssues[0]?.motivo ?? 'Linha inválida para importação',
          turma: row.turma,
        });
        continue;
      }

      report.alunos.validos++;

      let existente: ExistingChild | null = null;

      const or: Array<Record<string, unknown>> = [];
      if (row.codAluno) or.push({ codigoAluno: row.codAluno });
      if (row.inscricao) or.push({ inscricao: row.inscricao });
      if (row.cpf) or.push({ cpf: row.cpf });

      if (or.length > 0) {
        const encontrados = await prisma.child.findMany({
          where: { OR: or },
          select: {
            id: true,
            unitId: true,
            mantenedoraId: true,
            cpf: true,
            codigoAluno: true,
            inscricao: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        });

        const conflitoOutraUnidade = encontrados.find((c) => c.unitId !== unit.id);
        if (conflitoOutraUnidade) {
          report.alunos.cpfConflitoOutraUnidade++;
          report.alunos.comErro++;
          adicionarIssue(report, {
            linha: row.linha,
            campo: 'CPF/COD/INSCRIÇÃO',
            valor: row.cpf ?? row.codAluno ?? row.inscricao,
            motivo: `Registro já existe em outra unidade. childId=${conflitoOutraUnidade.id}`,
            severidade: 'BLOQUEANTE',
          });
          report.detalhes.alunos.push({
            linha: row.linha,
            chave: row.codAluno ? `codAluno:${row.codAluno}` : row.inscricao ? `inscricao:${row.inscricao}` : `cpf:${row.cpf}`,
            acao: 'CONFLITO',
            motivo: `Existe em outra unidade. childId=${conflitoOutraUnidade.id}`,
            turma: row.turma,
            childId: conflitoOutraUnidade.id,
          });
          continue;
        }

        existente = encontrados.find((c) => c.unitId === unit.id) ?? null;
      }

      const chave = row.codAluno ? `codAluno:${row.codAluno}` : row.inscricao ? `inscricao:${row.inscricao}` : `cpf:${row.cpf}`;

      if (existente) {
        report.alunos.seriam_atualizados++;
        report.detalhes.alunos.push({
          linha: row.linha,
          chave,
          acao: 'ATUALIZAR',
          motivo: 'Aluno existente na mesma unidade; dry-run não grava.',
          turma: row.turma,
          childId: existente.id,
        });
      } else {
        report.alunos.seriam_criados++;
        report.detalhes.alunos.push({
          linha: row.linha,
          chave,
          acao: 'CRIAR',
          motivo: 'Aluno não encontrado; dry-run não grava.',
          turma: row.turma,
        });
      }
    }
  }

  if (args.staffFile) {
    const { rows, issues } = lerPlanilhaProfissionais(args.staffFile);
    report.profissionais.lidos = rows.length;
    report.inconsistencias.push(...issues);

    for (const row of rows) {
      const linhaIssues = report.inconsistencias.filter((i) => i.linha === row.linha && i.severidade === 'BLOQUEANTE');

      if (!row.nome || !row.funcao || linhaIssues.length > 0) {
        report.profissionais.comErro++;
        report.detalhes.profissionais.push({
          linha: row.linha,
          chave: `linha-${row.linha}`,
          acao: 'ERRO',
          motivo: linhaIssues[0]?.motivo ?? 'Linha inválida para importação',
        });
        continue;
      }

      report.profissionais.validos++;

      const roleType = funcaoParaRoleType(row.funcao);
      if (!roleType) {
        report.profissionais.comErro++;
        adicionarIssue(report, {
          linha: row.linha,
          campo: 'FUNÇÃO',
          valor: row.funcao,
          motivo: `Função não mapeada para RoleType: ${row.funcao}`,
          severidade: 'BLOQUEANTE',
        });
        report.detalhes.profissionais.push({
          linha: row.linha,
          chave: row.email ? `email:${row.email}` : `nome:${row.nome}`,
          acao: 'ERRO',
          motivo: 'Função não mapeada',
        });
        continue;
      }

      let existente: { id: string; email: string; unitId: string | null; mantenedoraId: string } | null = null;
      if (row.email) {
        existente = await prisma.user.findUnique({
          where: { email: row.email },
          select: { id: true, email: true, unitId: true, mantenedoraId: true },
        });
      }

      const chave = row.email ? `email:${row.email}` : row.telefone ? `telefone:${row.telefone}|funcao:${row.funcao}` : `nome:${row.nome}|funcao:${row.funcao}`;

      if (existente && (existente.unitId !== unit.id || existente.mantenedoraId !== unit.mantenedoraId)) {
        report.profissionais.conflitosOutraUnidade++;
        adicionarIssue(report, {
          linha: row.linha,
          campo: 'E-MAIL',
          valor: row.email,
          motivo: `Usuário existe fora da unidade/mantenedora alvo. userId=${existente.id}`,
          severidade: 'BLOQUEANTE',
        });
        report.detalhes.profissionais.push({
          linha: row.linha,
          chave,
          acao: 'CONFLITO',
          motivo: `Usuário existe fora da unidade/mantenedora alvo. userId=${existente.id}`,
          roleType,
          userId: existente.id,
        });
        continue;
      }

      if (existente) {
        report.profissionais.seriam_atualizados++;
        report.detalhes.profissionais.push({
          linha: row.linha,
          chave,
          acao: 'ATUALIZAR',
          motivo: 'Usuário existente na mesma unidade; dry-run não grava.',
          roleType,
          userId: existente.id,
        });
      } else {
        report.profissionais.seriam_criados++;
        report.detalhes.profissionais.push({
          linha: row.linha,
          chave,
          acao: 'CRIAR',
          motivo: 'Profissional não encontrado. Nesta versão, NÃO cria User/senha; exige fluxo separado de convite/cadastro.',
          roleType,
        });
      }
    }
  }

  return report;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(): ImportArgs {
  const argv = process.argv.slice(2);
  const args: ImportArgs = {
    dryRun: true,
    apply: false,
    createMissingClassrooms: false,
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--students-file':
        args.studentsFile = path.resolve(argv[++i]);
        break;
      case '--staff-file':
        args.staffFile = path.resolve(argv[++i]);
        break;
      case '--unit-id':
        args.unitId = argv[++i];
        break;
      case '--unit-code':
        args.unitCode = argv[++i];
        break;
      case '--dry-run':
        args.dryRun = true;
        args.apply = false;
        break;
      case '--apply':
        args.apply = true;
        args.dryRun = false;
        break;
      case '--create-missing-classrooms':
        args.createMissingClassrooms = true;
        break;
      case '--report-out':
        args.reportOut = path.resolve(argv[++i]);
        break;
      default:
        break;
    }
  }

  return args;
}

function validarArgs(args: ImportArgs) {
  if (args.apply) {
    console.error('❌ --apply está bloqueado nesta versão. Rode apenas --dry-run.');
    process.exit(2);
  }

  if (!args.studentsFile && !args.staffFile) {
    console.error('❌ Informe --students-file e/ou --staff-file.');
    process.exit(1);
  }

  if (!args.unitId && !args.unitCode) {
    console.error('❌ Informe --unit-id ou --unit-code.');
    process.exit(1);
  }

  if (args.studentsFile && !fs.existsSync(args.studentsFile)) {
    console.error(`❌ Arquivo de alunos não encontrado: ${args.studentsFile}`);
    process.exit(1);
  }

  if (args.staffFile && !fs.existsSync(args.staffFile)) {
    console.error(`❌ Arquivo de profissionais não encontrado: ${args.staffFile}`);
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs();
  validarArgs(args);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  COCRIS Pedagógico — Importador DRY-RUN');
  console.log('  Modo: 🔍 DRY-RUN — nenhuma gravação será realizada');
  console.log('  --apply: bloqueado nesta versão');
  console.log('═══════════════════════════════════════════════════════════════');

  let report: ImportReport;
  try {
    report = await processarImportacao(args);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  RESUMO');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Unidade: ${report.unidade ? `${report.unidade.nome} (${report.unidade.code})` : 'NÃO RESOLVIDA'}`);
  console.log('');
  console.log('  ALUNOS');
  console.log(`    Lidos:                    ${report.alunos.lidos}`);
  console.log(`    Válidos:                  ${report.alunos.validos}`);
  console.log(`    Com erro:                 ${report.alunos.comErro}`);
  console.log(`    Seriam criados:           ${report.alunos.seriam_criados}`);
  console.log(`    Seriam atualizados:       ${report.alunos.seriam_atualizados}`);
  console.log(`    CPF duplicado planilha:   ${report.alunos.cpfDuplicadoNaPlanilha}`);
  console.log(`    Conflito outra unidade:   ${report.alunos.cpfConflitoOutraUnidade}`);
  console.log(`    Turmas encontradas:       ${report.alunos.turmasEncontradas.length}`);
  console.log(`    Turmas ausentes:          ${report.alunos.turmasAusentes.length}`);
  console.log('');
  console.log('  PROFISSIONAIS');
  console.log(`    Lidos:                    ${report.profissionais.lidos}`);
  console.log(`    Válidos:                  ${report.profissionais.validos}`);
  console.log(`    Com erro:                 ${report.profissionais.comErro}`);
  console.log(`    Seriam criados:           ${report.profissionais.seriam_criados}`);
  console.log(`    Seriam atualizados:       ${report.profissionais.seriam_atualizados}`);
  console.log(`    Conflitos outra unidade:  ${report.profissionais.conflitosOutraUnidade}`);
  console.log('');

  if (report.inconsistencias.length) {
    console.log(`  INCONSISTÊNCIAS: ${report.inconsistencias.length}`);
    report.inconsistencias.slice(0, 25).forEach((i) => {
      const prefix = i.linha > 0 ? `Linha ${i.linha}` : 'Geral';
      console.log(`    ${prefix} | ${i.campo} | ${i.severidade ?? 'AVISO'} | ${i.motivo}`);
    });
    if (report.inconsistencias.length > 25) {
      console.log(`    ... mais ${report.inconsistencias.length - 25} no relatório JSON`);
    }
  }

  if (report.errosBloqueantes.length) {
    console.log(`\n  ⛔ ERROS BLOQUEANTES: ${report.errosBloqueantes.length}`);
    report.errosBloqueantes.forEach((e) => console.log(`    - ${e}`));
  }

  const reportPath = args.reportOut ?? path.join(
    path.dirname(args.studentsFile ?? args.staffFile ?? '.'),
    `dry-run-report-${Date.now()}.json`
  );

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`\n  📄 Relatório salvo em: ${reportPath}`);
  console.log('  ✅ Dry-run concluído. Nenhuma gravação foi realizada.');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (report.errosBloqueantes.length > 0) {
    process.exitCode = 3;
  }
}

main().catch(async (err) => {
  await prisma.$disconnect().catch(() => undefined);
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
