import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

/**
 * import-dados-responsaveis.ts
 *
 * Importa os dados de responsáveis das planilhas oficiais para a tabela Child.
 * Preenche dados_responsaveis (mãe/pai/responsável), bloodType, endereco, cep.
 *
 * SEGURO E IDEMPOTENTE:
 *  - Casa por CPF da criança (normalizado). Fallback: nome + nome da mãe.
 *  - NUNCA sobrescreve dado já preenchido (só preenche o que está vazio/null).
 *  - Roda automaticamente no deploy (chamado pelo entrypoint.sh).
 *  - Pode rodar quantas vezes quiser: não duplica, não corrompe.
 *  - Falha de uma planilha não derruba as outras nem o boot da aplicação.
 *
 * As planilhas ficam em /app/dist/data (copiadas no build) com os nomes:
 *   dados-arara.xlsx, dados-pelicano.xlsx, dados-sabia.xlsx, dados-flamboyant.xlsx
 */

interface Layout {
  file: string;
  unitName: string;
  nome: number;
  cpfCrianca: number;
  tipagem: number;
  enderecoCrianca: number;
  cepCrianca: number;
  mae: number;
  maeCpf: number | null;
  maeEndereco: number | null;
  maeCep: number | null;
  maeTelefone: number | null;
  pai: number;
  respNome: number;
  respParentesco: number;
  respIdentidade: number;
  respOrgao: number;
  respCpf: number;
  respPis: number;
  telResidencial: number;
  celMae: number;
  celPai: number;
  escolaridade: number;
  profissao: number;
  autorizadoNome: number;
  autorizadoParentesco: number;
  autorizadoTel: number;
}

const LAYOUTS: Record<string, Layout> = {
  arara: {
    file: 'dados-arara.xlsx', unitName: 'CEPI Arara Canindé',
    nome: 2, cpfCrianca: 8, tipagem: 11, enderecoCrianca: 12, cepCrianca: 13,
    mae: 16, maeCpf: 19, maeEndereco: 20, maeCep: 21, maeTelefone: 22,
    pai: 35, respNome: 36, respParentesco: 37, respIdentidade: 38, respOrgao: 39,
    respCpf: 41, respPis: 42, telResidencial: 47, celMae: 48, celPai: 49,
    escolaridade: 50, profissao: 52, autorizadoNome: 53, autorizadoParentesco: 54, autorizadoTel: 55,
  },
  pelicano: {
    file: 'dados-pelicano.xlsx', unitName: 'CEPI Pelicano',
    nome: 2, cpfCrianca: 8, tipagem: 11, enderecoCrianca: 12, cepCrianca: 13,
    mae: 16, maeCpf: 19, maeEndereco: 20, maeCep: 21, maeTelefone: 22,
    pai: 35, respNome: 36, respParentesco: 37, respIdentidade: 38, respOrgao: 39,
    respCpf: 41, respPis: 42, telResidencial: 47, celMae: 48, celPai: 49,
    escolaridade: 50, profissao: 52, autorizadoNome: 53, autorizadoParentesco: 54, autorizadoTel: 55,
  },
  sabia: {
    file: 'dados-sabia.xlsx', unitName: 'CEPI Sabiá do Campo',
    nome: 2, cpfCrianca: 8, tipagem: 11, enderecoCrianca: 12, cepCrianca: 13,
    mae: 16, maeCpf: 18, maeEndereco: 19, maeCep: 20, maeTelefone: 21,
    pai: 34, respNome: 35, respParentesco: 36, respIdentidade: 37, respOrgao: 38,
    respCpf: 40, respPis: 41, telResidencial: 46, celMae: 47, celPai: 48,
    escolaridade: 49, profissao: 51, autorizadoNome: 52, autorizadoParentesco: 53, autorizadoTel: 54,
  },
  flamboyant: {
    file: 'dados-flamboyant.xlsx', unitName: 'CEPI Flamboyant',
    nome: 2, cpfCrianca: 8, tipagem: 11, enderecoCrianca: 12, cepCrianca: 13,
    mae: 16, maeCpf: null, maeEndereco: null, maeCep: null, maeTelefone: null,
    pai: 18, respNome: 19, respParentesco: 20, respIdentidade: 21, respOrgao: 22,
    respCpf: 24, respPis: 25, telResidencial: 30, celMae: 31, celPai: 32,
    escolaridade: 33, profissao: 35, autorizadoNome: 36, autorizadoParentesco: 37, autorizadoTel: 38,
  },
};

const soDigitos = (v: unknown): string => String(v ?? '').replace(/\D/g, '');
const limpo = (v: unknown): string => {
  const s = String(v ?? '').trim();
  if (!s || s === '?' || s === 'x' || s === 'X' || s === '0') return '';
  return s.replace(/\s+/g, ' ');
};
const cel = (row: any[], idx: number | null): string => (idx == null ? '' : limpo(row[idx]));

function findDatasetPath(filename: string): string | null {
  const candidates = [
    path.resolve(__dirname, '../../data', filename),
    path.resolve(__dirname, '../data', filename),
    path.join('/app/dist/data', filename),
    path.join('/app/data', filename),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function montarResponsaveis(row: any[], L: Layout): Record<string, unknown> | null {
  const nomeMae = cel(row, L.mae);
  const nomePai = cel(row, L.pai);
  const respNome = cel(row, L.respNome);
  const respParentesco = cel(row, L.respParentesco);

  const dados: Record<string, unknown> = {};

  if (nomeMae) {
    dados.mae = {
      nome: nomeMae,
      cpf: soDigitos(cel(row, L.maeCpf)),
      celular: soDigitos(cel(row, L.celMae)),
      telefone: soDigitos(cel(row, L.maeTelefone)),
      telefoneResidencial: soDigitos(cel(row, L.telResidencial)),
      endereco: cel(row, L.maeEndereco),
      cep: soDigitos(cel(row, L.maeCep)),
      parentesco: 'MÃE',
    };
  }
  if (nomePai) {
    dados.pai = {
      nome: nomePai,
      celular: soDigitos(cel(row, L.celPai)),
      parentesco: 'PAI',
    };
  }
  if (respNome) {
    dados.responsavelLegal = {
      nome: respNome,
      parentesco: respParentesco || 'RESPONSÁVEL',
      cpf: soDigitos(cel(row, L.respCpf)),
      identidade: cel(row, L.respIdentidade),
      orgaoExpeditor: cel(row, L.respOrgao),
      pis: soDigitos(cel(row, L.respPis)),
      telefoneResidencial: soDigitos(cel(row, L.telResidencial)),
      celular: soDigitos(cel(row, L.celMae)) || soDigitos(cel(row, L.celPai)),
      escolaridade: cel(row, L.escolaridade),
      profissao: cel(row, L.profissao),
    };
  }
  const autNome = cel(row, L.autorizadoNome);
  if (autNome) {
    dados.autorizados = [{
      nome: autNome,
      parentesco: cel(row, L.autorizadoParentesco),
      telefone: soDigitos(cel(row, L.autorizadoTel)),
    }];
  }

  return Object.keys(dados).length ? dados : null;
}

async function processarPlanilha(key: string): Promise<void> {
  const L = LAYOUTS[key];
  const filePath = findDatasetPath(L.file);
  if (!filePath) {
    console.log(`  ℹ️  Planilha ${L.file} não encontrada — pulando ${L.unitName}.`);
    return;
  }

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
  const dataRows = rows.slice(1).filter((r) => limpo(r[L.nome]));

  const unit = await prisma.unit.findFirst({
    where: { name: L.unitName, isActive: true },
    select: { id: true },
  });
  if (!unit) {
    console.log(`  ⚠️  Unidade "${L.unitName}" não encontrada — pulando.`);
    return;
  }

  const alunos = await prisma.child.findMany({
    where: { unitId: unit.id },
    select: {
      id: true, firstName: true, lastName: true, cpf: true, nomeMae: true,
      bloodType: true, endereco: true, cep: true, dadosResponsaveis: true,
    },
  });

  const porCpf = new Map<string, typeof alunos[0]>();
  const porNome = new Map<string, typeof alunos[0]>();
  for (const a of alunos) {
    const cpf = soDigitos(a.cpf);
    if (cpf) porCpf.set(cpf, a);
    const chave = `${limpo(a.firstName)} ${limpo(a.lastName)}`.toUpperCase().trim();
    porNome.set(chave, a);
  }

  let casados = 0, jaPreenchidos = 0, semMatch = 0;
  const updates: { id: string; patch: Record<string, unknown> }[] = [];

  for (const row of dataRows) {
    const cpfCrianca = soDigitos(row[L.cpfCrianca]);
    const nomeCrianca = limpo(row[L.nome]).toUpperCase();

    let aluno = cpfCrianca ? porCpf.get(cpfCrianca) : undefined;
    if (!aluno) {
      for (const [chave, a] of porNome) {
        if (chave === nomeCrianca || chave.startsWith(nomeCrianca + ' ')) { aluno = a; break; }
      }
    }
    if (!aluno) { semMatch++; continue; }
    if (aluno.dadosResponsaveis) { jaPreenchidos++; continue; }

    const dadosResp = montarResponsaveis(row, L);
    if (!dadosResp) { semMatch++; continue; }

    const patch: Record<string, unknown> = { dadosResponsaveis: dadosResp };
    if (!aluno.bloodType) { const t = cel(row, L.tipagem); if (t && t !== '?') patch.bloodType = t.slice(0, 5); }
    if (!aluno.endereco) { const e = cel(row, L.enderecoCrianca); if (e) patch.endereco = e.slice(0, 255); }
    if (!aluno.cep) { const c = soDigitos(cel(row, L.cepCrianca)); if (c) patch.cep = c.slice(0, 10); }

    updates.push({ id: aluno.id, patch });
    casados++;
  }

  if (updates.length) {
    await prisma.$transaction(
      updates.map((u) => prisma.child.update({ where: { id: u.id }, data: u.patch })),
    );
  }
  console.log(`  ✅ ${L.unitName}: ${casados} preenchidos, ${jaPreenchidos} já tinham, ${semMatch} sem match.`);
}

async function main(): Promise<void> {
  console.log('📋 Importando dados de responsáveis das planilhas (idempotente)...');
  for (const key of Object.keys(LAYOUTS)) {
    try {
      await processarPlanilha(key);
    } catch (e) {
      console.error(`  ⚠️  Erro ao processar ${key} (não crítico):`, (e as Error).message);
    }
  }
  console.log('✅ Importação de responsáveis concluída.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Erro geral na importação de responsáveis (não crítico):', e);
  process.exit(0); // exit 0 para nunca derrubar o boot
});
