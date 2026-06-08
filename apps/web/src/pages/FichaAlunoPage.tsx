/**
 * FichaAlunoPage — Ficha completa do aluno com impressão/PDF
 *
 * - Carrega todos os dados do aluno via GET /children/:id
 * - Logo da unidade configurável por unidade (salva em localStorage por unitId)
 * - Impressão via window.print() com CSS @media print dedicado
 * - Identidade visual por unidade (nome, endereço, telefone, e-mail)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Download,
  Edit2,
  Loader2,
  Printer,
  Save,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Responsavel {
  nome?: string;
  parentesco?: string;
  cpf?: string;
  celular?: string;
  telefoneResidencial?: string;
  telefoneTrabalho?: string;
  email?: string;
  profissao?: string;
  escolaridade?: string;
  endereco?: string;
  cep?: string;
}

interface Autorizado {
  nome?: string;
  parentesco?: string;
  telefone?: string;
  documento?: string;
}

interface DiarioEvento {
  id: string;
  type?: string;
  eventDate?: string;
  createdAt?: string;
  notes?: string;
  description?: string;
  observations?: string;
  tags?: string[];
}

interface FichaInlineForm {
  serieAnterior: string;
  observacoesSecretaria: string;
  usoImagem: boolean;
  transporteEscolar: boolean;
  nomeTransporte: string;
}

interface Aluno {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  cpf?: string;
  rg?: string;
  nacionalidade?: string;
  naturalidade?: string;
  ufNascimento?: string;
  raca?: string;
  peso?: string;
  bloodType?: string;
  nis?: string;
  codigoAluno?: string;
  inscricao?: string;
  nomeMae?: string;
  nomePai?: string;
  celPai?: string;
  endereco?: string;
  cep?: string;
  allergies?: string;
  medicalConditions?: string;
  medicationNeeds?: string;
  medicamentos?: string;
  laudado?: boolean;
  tipoLaudo?: string;
  cid?: string;
  descricaoLaudo?: string;
  usoImagem?: boolean;
  photoUrl?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  dadosResponsaveis?: {
    mae?: Responsavel;
    pai?: Responsavel;
    responsavelLegal?: Responsavel;
  };
  documentosMatricula?: Record<string, boolean>;
  autorizadosRetirada?: Autorizado[];
  transporteEscolar?: { utiliza?: boolean; nomeTransporte?: string };
  fichaAdministrativa?: {
    genitor?: string;
    serieAnterior?: string;
    observacoesSecretaria?: string;
  };
  unit?: {
    id: string;
    name: string;
    code: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    phone?: string;
    email?: string;
  };
  enrollments?: Array<{
    status: string;
    enrollmentDate?: string;
    classroom?: { name?: string };
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarData(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return iso;
  }
}

function calcularIdade(iso?: string): string {
  if (!iso) return '';
  try {
    const nasc = new Date(iso);
    const hoje = new Date();
    let anos = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;
    return `${anos} ano${anos !== 1 ? 's' : ''}`;
  } catch {
    return '';
  }
}

function generoLabel(g?: string): string {
  const map: Record<string, string> = {
    MASCULINO: 'Masculino',
    FEMININO: 'Feminino',
    OUTRO: 'Outro',
    NAO_INFORMADO: 'Não informado',
  };
  return g ? (map[g] ?? g) : '—';
}

function logoKey(unitId: string) {
  return `conexa:unit:logo:${unitId}`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function FichaAlunoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [modalLogo, setModalLogo] = useState(false);
  const [editandoInline, setEditandoInline] = useState(false);
  const [salvandoInline, setSalvandoInline] = useState(false);
  const [ocorrencias, setOcorrencias] = useState<DiarioEvento[]>([]);
  const [fichaForm, setFichaForm] = useState<FichaInlineForm>({
    serieAnterior: '',
    observacoesSecretaria: '',
    usoImagem: false,
    transporteEscolar: false,
    nomeTransporte: '',
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Carregar aluno
  const carregar = useCallback(async () => {
    if (!id) return;
    setCarregando(true);
    try {
      const res = await http.get(`/children/${id}`);
      setAluno(res.data);
      setFichaForm({
        serieAnterior: res.data?.fichaAdministrativa?.serieAnterior ?? '',
        observacoesSecretaria: res.data?.fichaAdministrativa?.observacoesSecretaria ?? '',
        usoImagem: Boolean(res.data?.usoImagem),
        transporteEscolar: Boolean(res.data?.transporteEscolar?.utiliza),
        nomeTransporte: res.data?.transporteEscolar?.nomeTransporte ?? '',
      });
      // Carregar logo da unidade do localStorage
      const unitId = res.data?.unit?.id ?? res.data?.unitId;
      if (unitId) {
        const salvo = localStorage.getItem(logoKey(unitId));
        if (salvo) setLogoUrl(salvo);
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
      navigate('/app/secretaria/matriculas');
    } finally {
      setCarregando(false);
    }
  }, [id, navigate]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!id) return;
    http.get('/diary-events', { params: { childId: id, limit: 20 } })
      .then((res) => setOcorrencias(Array.isArray(res.data) ? res.data : res.data?.items ?? []))
      .catch(() => setOcorrencias([]));
  }, [id]);

  async function salvarInline() {
    if (!aluno || !id) return;
    setSalvandoInline(true);
    try {
      const payload = {
        usoImagem: fichaForm.usoImagem,
        transporteEscolar: {
          utiliza: fichaForm.transporteEscolar,
          nomeTransporte: fichaForm.nomeTransporte.trim() || undefined,
        },
        fichaAdministrativa: {
          ...(aluno.fichaAdministrativa ?? {}),
          serieAnterior: fichaForm.serieAnterior.trim() || undefined,
          observacoesSecretaria: fichaForm.observacoesSecretaria.trim() || undefined,
        },
      };
      const res = await http.put(`/children/${id}`, payload);
      setAluno((atual) => ({
        ...(atual ?? aluno),
        ...(res.data ?? {}),
        usoImagem: payload.usoImagem,
        transporteEscolar: payload.transporteEscolar,
        fichaAdministrativa: payload.fichaAdministrativa,
      }));
      setEditandoInline(false);
      toast.success('Ficha atualizada com sucesso.');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvandoInline(false);
    }
  }

  // Upload logo
  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.error('Logo deve ter menos de 500KB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setLogoUrl(base64);
      const unitId = aluno?.unit?.id;
      if (unitId) localStorage.setItem(logoKey(unitId), base64);
      setModalLogo(false);
      toast.success('Logo da unidade salva.');
    };
    reader.readAsDataURL(file);
  }

  function removerLogo() {
    const unitId = aluno?.unit?.id;
    if (unitId) localStorage.removeItem(logoKey(unitId));
    setLogoUrl('');
    setModalLogo(false);
    toast.success('Logo removida.');
  }

  function imprimir() {
    window.print();
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!aluno) return null;

  const matriculaAtiva = aluno.enrollments?.find(e => e.status === 'ATIVA');
  const unit = aluno.unit;
  const dad = aluno.dadosResponsaveis ?? {};
  const docs = aluno.documentosMatricula ?? {};
  const autorizados = aluno.autorizadosRetirada ?? [];
  const transporte = aluno.transporteEscolar;
  const ficha = aluno.fichaAdministrativa ?? {};

  const enderecoUnit = [unit?.address, unit?.city, unit?.state, unit?.zipCode]
    .filter(Boolean).join(', ');

  return (
    <>
      {/* ── CSS de impressão injetado ───────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #ficha-impressao, #ficha-impressao * { visibility: visible !important; }
          #ficha-impressao { position: fixed !important; inset: 0 !important; padding: 0 !important; margin: 0 !important; z-index: 9999 !important; background: white !important; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          .secao { page-break-inside: avoid; }
        }
        @page { size: A4; margin: 14mm 14mm 14mm 14mm; }
      `}</style>

      {/* ── Barra de ações (não imprime) ───────────────────────────────── */}
      <div className="no-print sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <div className="flex-1" />
          <button
            onClick={() => navigate(`/app/secretaria/matriculas/${aluno.id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Edit2 className="h-4 w-4" /> Editar completa
          </button>
          <button
            onClick={() => setEditandoInline((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Edit2 className="h-4 w-4" /> {editandoInline ? 'Cancelar edição rápida' : 'Edição rápida'}
          </button>
          {editandoInline && (
            <button
              onClick={salvarInline}
              disabled={salvandoInline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {salvandoInline ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar ficha
            </button>
          )}
          <button
            onClick={() => setModalLogo(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Camera className="h-4 w-4" /> Logo da Unidade
          </button>
          <button
            onClick={imprimir}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* ── Ficha ──────────────────────────────────────────────────────── */}
      <div id="ficha-impressao" className="max-w-4xl mx-auto px-4 py-6 bg-white">

        {/* Cabeçalho da unidade */}
        <div className="flex items-start gap-4 pb-4 border-b-2 border-slate-800 mb-6">
          {/* Logo */}
          <div className="flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-20 w-20 object-contain" />
            ) : (
              <div className="h-20 w-20 rounded-lg bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center no-print">
                <Camera className="h-8 w-8 text-slate-400" />
              </div>
            )}
          </div>

          {/* Dados da unidade */}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
              {unit?.name ?? 'Unidade'}
            </h1>
            {enderecoUnit && (
              <p className="text-sm text-slate-600 mt-0.5">{enderecoUnit}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              {unit?.phone && <span className="text-sm text-slate-600">Tel: {unit.phone}</span>}
              {unit?.email && <span className="text-sm text-slate-600">E-mail: {unit.email}</span>}
            </div>
          </div>

          {/* Título ficha */}
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Ficha de Matrícula</p>
            <p className="text-sm text-slate-700 mt-1">Ano letivo {new Date().getFullYear()}</p>
            {aluno.codigoAluno && <p className="text-sm text-slate-700">Cód: {aluno.codigoAluno}</p>}
            {aluno.inscricao && <p className="text-sm text-slate-700">Inscrição: {aluno.inscricao}</p>}
          </div>
        </div>

        {/* ── SEÇÃO 1 — Identificação do Aluno ─────────────────────────── */}
        <Secao titulo="1. Identificação do Aluno">
          <div className="flex gap-6">
            {/* Foto */}
            <div className="flex-shrink-0">
              <div className="w-28 h-32 rounded-lg border-2 border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                {aluno.photoUrl ? (
                  <img src={aluno.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-slate-400">
                    <Camera className="h-8 w-8 mx-auto mb-1" />
                    <span className="text-xs">Foto</span>
                  </div>
                )}
              </div>
            </div>

            {/* Dados */}
            <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1">
              <Campo label="Nome completo" valor={`${aluno.firstName} ${aluno.lastName}`} span2 />
              <Campo label="Data de nascimento" valor={`${formatarData(aluno.dateOfBirth)} (${calcularIdade(aluno.dateOfBirth)})`} />
              <Campo label="Sexo" valor={generoLabel(aluno.gender)} />
              <Campo label="CPF" valor={aluno.cpf} />
              <Campo label="RG" valor={aluno.rg} />
              <Campo label="Tipo sanguíneo" valor={aluno.bloodType} />
              <Campo label="Raça/Cor" valor={aluno.raca} />
              <Campo label="Peso" valor={aluno.peso} />
              <Campo label="Nacionalidade" valor={aluno.nacionalidade} />
              <Campo label="Naturalidade" valor={aluno.naturalidade ? `${aluno.naturalidade}/${aluno.ufNascimento ?? ''}` : undefined} />
              <Campo label="NIS" valor={aluno.nis} />
              <Campo label="Endereço" valor={aluno.endereco} />
              <Campo label="CEP" valor={aluno.cep} />
            </div>
          </div>
        </Secao>

        {/* ── SEÇÃO 2 — Matrícula ───────────────────────────────────────── */}
        <Secao titulo="2. Dados da Matrícula">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <Campo label="Turma" valor={matriculaAtiva?.classroom?.name} />
            <Campo label="Data de matrícula" valor={formatarData(matriculaAtiva?.enrollmentDate)} />
            <Campo label="Status" valor={matriculaAtiva?.status ?? 'Sem matrícula ativa'} />
            {editandoInline ? (
              <CampoEditavel label="Série anterior" value={fichaForm.serieAnterior} onChange={(valor) => setFichaForm((atual) => ({ ...atual, serieAnterior: valor }))} />
            ) : (
              <Campo label="Série anterior" valor={ficha.serieAnterior} />
            )}
            {editandoInline ? (
              <CampoBooleano label="Autorização de uso de imagem" checked={fichaForm.usoImagem} onChange={(valor) => setFichaForm((atual) => ({ ...atual, usoImagem: valor }))} />
            ) : (
              <Campo label="Autorização de uso de imagem" valor={aluno.usoImagem ? 'Sim' : 'Não'} />
            )}
          </div>
        </Secao>

        {/* ── SEÇÃO 3 — Filiação ────────────────────────────────────────── */}
        <Secao titulo="3. Filiação">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <Campo label="Nome da mãe" valor={aluno.nomeMae} span2 />
            <Campo label="Nome do pai" valor={aluno.nomePai} span2 />
            <Campo label="Celular (emergência)" valor={aluno.celPai} />
            <Campo label="Responsável para emergência" valor={aluno.emergencyContactName} />
            <Campo label="Telefone emergência" valor={aluno.emergencyContactPhone} />
          </div>
        </Secao>

        {/* ── SEÇÃO 4 — Responsável Mãe ────────────────────────────────── */}
        {dad.mae?.nome && <SecaoResponsavel titulo="4. Dados da Mãe" resp={dad.mae} />}

        {/* ── SEÇÃO 5 — Responsável Pai ────────────────────────────────── */}
        {dad.pai?.nome && <SecaoResponsavel titulo="5. Dados do Pai" resp={dad.pai} />}

        {/* ── SEÇÃO 6 — Responsável Legal ──────────────────────────────── */}
        {dad.responsavelLegal?.nome && (
          <SecaoResponsavel titulo="6. Responsável Legal" resp={dad.responsavelLegal} showParentesco />
        )}

        {/* ── SEÇÃO 7 — Saúde ──────────────────────────────────────────── */}
        <Secao titulo="7. Informações de Saúde">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <Campo label="Alergias" valor={aluno.allergies} span2 />
            <Campo label="Condições médicas" valor={aluno.medicalConditions} span2 />
            <Campo label="Necessidades de medicação" valor={aluno.medicationNeeds} span2 />
            <Campo label="Medicamentos em uso" valor={aluno.medicamentos} span2 />
            <Campo label="Possui laudo" valor={aluno.laudado ? 'Sim' : 'Não'} />
            {aluno.laudado && <>
              <Campo label="Tipo de laudo" valor={aluno.tipoLaudo} />
              <Campo label="CID" valor={aluno.cid} />
              <Campo label="Descrição do laudo" valor={aluno.descricaoLaudo} span2 />
            </>}
          </div>
        </Secao>

        {/* ── SEÇÃO 8 — Transporte ─────────────────────────────────────── */}
        <Secao titulo="8. Transporte Escolar">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {editandoInline ? (
              <CampoBooleano label="Utiliza transporte escolar" checked={fichaForm.transporteEscolar} onChange={(valor) => setFichaForm((atual) => ({ ...atual, transporteEscolar: valor }))} />
            ) : (
              <Campo label="Utiliza transporte escolar" valor={transporte?.utiliza ? 'Sim' : 'Não'} />
            )}
            {editandoInline ? (
              <CampoEditavel label="Nome do transporte/empresa" value={fichaForm.nomeTransporte} onChange={(valor) => setFichaForm((atual) => ({ ...atual, nomeTransporte: valor }))} />
            ) : transporte?.utiliza && (
              <Campo label="Nome do transporte/empresa" valor={transporte.nomeTransporte} />
            )}
          </div>
        </Secao>

        {/* ── SEÇÃO 9 — Autorizados para Retirada ──────────────────────── */}
        {autorizados.length > 0 && (
          <Secao titulo="9. Pessoas Autorizadas para Retirada">
            <div className="space-y-2">
              {autorizados.filter(a => a.nome?.trim()).map((a, i) => (
                <div key={i} className="grid grid-cols-3 gap-x-6 gap-y-0.5 border-b border-slate-100 pb-2">
                  <Campo label={`Autorizado ${i + 1}`} valor={a.nome} />
                  <Campo label="Parentesco" valor={a.parentesco} />
                  <Campo label="Telefone" valor={a.telefone} />
                  {a.documento && <Campo label="Documento" valor={a.documento} />}
                </div>
              ))}
            </div>
          </Secao>
        )}

        {/* ── SEÇÃO 10 — Documentação ──────────────────────────────────── */}
        {Object.keys(docs).length > 0 && (
          <Secao titulo="10. Documentação Entregue">
            <div className="flex flex-wrap gap-2">
              {Object.entries(docs).map(([doc, entregue]) => (
                <span
                  key={doc}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    entregue
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {entregue ? '✓' : '✗'} {doc.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              ))}
            </div>
          </Secao>
        )}

        {/* ── SEÇÃO 11 — Observações ───────────────────────────────────── */}
        {(ficha.observacoesSecretaria || editandoInline) && (
          <Secao titulo="11. Observações da Secretaria">
            {editandoInline ? (
              <textarea
                value={fichaForm.observacoesSecretaria}
                onChange={(e) => setFichaForm((atual) => ({ ...atual, observacoesSecretaria: e.target.value }))}
                rows={4}
                className="no-print w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm text-slate-700 whitespace-pre-line">{ficha.observacoesSecretaria}</p>
            )}
          </Secao>
        )}

        {/* ── SEÇÃO 12 — Ocorrências recentes ───────────────────────────── */}
        <Secao titulo="12. Ocorrências e registros recentes">
          {ocorrencias.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma ocorrência recente localizada no diário do aluno.</p>
          ) : (
            <div className="space-y-2">
              {ocorrencias.map((evento) => (
                <div key={evento.id} className="rounded-lg border border-slate-100 p-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase">{evento.type ?? 'Registro'}</span>
                    <span className="text-xs text-slate-500">{formatarData(evento.eventDate ?? evento.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">
                    {evento.notes ?? evento.description ?? evento.observations ?? 'Registro sem descrição textual.'}
                  </p>
                  {evento.tags && evento.tags.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">Tags: {evento.tags.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Secao>

        {/* ── Rodapé ───────────────────────────────────────────────────── */}
        <div className="mt-10 pt-6 border-t border-slate-300 grid grid-cols-3 gap-8">
          <AssinaturaLinha label="Responsável pelo Aluno" />
          <AssinaturaLinha label="Secretaria" />
          <AssinaturaLinha label="Direção" />
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Ficha gerada em {new Date().toLocaleDateString('pt-BR')} — {unit?.name} — Sistema COCRIS Pedagógico
        </p>
      </div>

      {/* ── Modal Logo da Unidade ──────────────────────────────────────── */}
      {modalLogo && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Logo da Unidade</h3>
              <button onClick={() => setModalLogo(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              A logo é salva localmente para <strong>{unit?.name}</strong> e aparecerá em todas as fichas desta unidade.
            </p>
            {logoUrl && (
              <div className="mb-4 flex justify-center">
                <img src={logoUrl} alt="Logo atual" className="h-20 object-contain border rounded-lg p-2" />
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <div className="flex gap-2">
              <button
                onClick={() => logoInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                <Upload className="h-4 w-4" />
                {logoUrl ? 'Trocar logo' : 'Enviar logo'}
              </button>
              {logoUrl && (
                <button
                  onClick={removerLogo}
                  className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50"
                >
                  Remover
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">Máximo 500KB — PNG, JPG ou SVG</p>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="secao mb-5">
      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide bg-slate-100 px-3 py-1.5 rounded mb-3 border-l-4 border-blue-600">
        {titulo}
      </h2>
      <div className="px-1">{children}</div>
    </div>
  );
}

function Campo({
  label,
  valor,
  span2,
}: {
  label: string;
  valor?: string | null;
  span2?: boolean;
}) {
  return (
    <div className={`min-h-[2rem] ${span2 ? 'col-span-2' : ''}`}>
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block leading-none mb-0.5">
        {label}
      </span>
      <span className="text-sm text-slate-800 border-b border-dotted border-slate-300 block pb-0.5 min-h-[1.25rem]">
        {valor ?? '—'}
      </span>
    </div>
  );
}

function CampoEditavel({ label, value, onChange }: { label: string; value: string; onChange: (valor: string) => void }) {
  return (
    <div className="min-h-[2rem]">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block leading-none mb-0.5">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="no-print w-full rounded border border-slate-200 px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function CampoBooleano({ label, checked, onChange }: { label: string; checked: boolean; onChange: (valor: boolean) => void }) {
  return (
    <label className="no-print min-h-[2rem] flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="font-medium">{label}</span>
    </label>
  );
}

function SecaoResponsavel({
  titulo,
  resp,
  showParentesco,
}: {
  titulo: string;
  resp: Responsavel;
  showParentesco?: boolean;
}) {
  return (
    <Secao titulo={titulo}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <Campo label="Nome" valor={resp.nome} span2 />
        {showParentesco && <Campo label="Parentesco" valor={resp.parentesco} />}
        <Campo label="CPF" valor={resp.cpf} />
        <Campo label="Celular" valor={resp.celular} />
        <Campo label="Telefone residencial" valor={resp.telefoneResidencial} />
        <Campo label="Telefone trabalho" valor={resp.telefoneTrabalho} />
        <Campo label="E-mail" valor={resp.email} />
        <Campo label="Profissão" valor={resp.profissao} />
        <Campo label="Escolaridade" valor={resp.escolaridade} />
        <Campo label="Endereço" valor={resp.endereco} />
        <Campo label="CEP" valor={resp.cep} />
      </div>
    </Secao>
  );
}

function AssinaturaLinha({ label }: { label: string }) {
  return (
    <div className="text-center">
      <div className="border-b border-slate-400 mb-2 h-10" />
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}
