/**
 * MatriculaPage — Fluxo de Matrícula em 6 Etapas
 *
 * Etapas:
 * 1. Dados da criança
 * 2. Responsáveis
 * 3. Saúde e necessidades especiais
 * 4. Documentos e autorizações
 * 5. Turma e unidade
 * 6. Revisão e confirmação
 *
 * RBAC: UNIDADE_ADMINISTRATIVO, UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
 * Usa endpoints existentes: POST /children, POST /children/:id/enrollment
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Button } from '../components/ui/button';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { toast } from 'sonner';
import {
  ChevronRight, ChevronLeft, CheckCircle, User, Users,
  Heart, FileText, GraduationCap, ClipboardCheck, Loader2,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DadosCrianca {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  cpf: string;
  rg: string;
  raca: string;
  nis: string;
  codigoAluno: string;
  inscricao: string;
}

interface Responsavel {
  nome: string;
  relacao: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
  bairro: string;
  cidade: string;
  cep: string;
}

interface DadosSaude {
  bloodType: string;
  allergies: string;
  medicalConditions: string;
  medicationNeeds: string;
  laudado: boolean;
  tipoLaudo: string;
  cid: string;
  descricaoLaudo: string;
  medicamentos: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

interface DadosDocumentos {
  usoImagem: boolean;
  observacoes: string;
}

interface DadosTurma {
  classroomId: string;
  enrollmentDate: string;
}

// ─── Etapas ───────────────────────────────────────────────────────────────────

const ETAPAS = [
  { id: 1, label: 'Criança',       icon: <User className="h-4 w-4" /> },
  { id: 2, label: 'Responsáveis',  icon: <Users className="h-4 w-4" /> },
  { id: 3, label: 'Saúde',         icon: <Heart className="h-4 w-4" /> },
  { id: 4, label: 'Documentos',    icon: <FileText className="h-4 w-4" /> },
  { id: 5, label: 'Turma',         icon: <GraduationCap className="h-4 w-4" /> },
  { id: 6, label: 'Revisão',       icon: <ClipboardCheck className="h-4 w-4" /> },
];

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function MatriculaPage() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);

  // Estado de cada etapa
  const [crianca, setCrianca] = useState<DadosCrianca>({
    firstName: '', lastName: '', dateOfBirth: '', gender: 'NAO_INFORMADO',
    cpf: '', rg: '', raca: '', nis: '', codigoAluno: '', inscricao: '',
  });
  const [responsavel, setResponsavel] = useState<Responsavel>({
    nome: '', relacao: 'MAE', cpf: '', telefone: '', email: '',
    endereco: '', bairro: '', cidade: '', cep: '',
  });
  const [saude, setSaude] = useState<DadosSaude>({
    bloodType: '', allergies: '', medicalConditions: '', medicationNeeds: '',
    laudado: false, tipoLaudo: '', cid: '', descricaoLaudo: '', medicamentos: '',
    emergencyContactName: '', emergencyContactPhone: '',
  });
  const [documentos, setDocumentos] = useState<DadosDocumentos>({
    usoImagem: false, observacoes: '',
  });
  const [turma, setTurma] = useState<DadosTurma>({
    classroomId: '', enrollmentDate: new Date().toISOString().split('T')[0],
  });
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [classroomsLoaded, setClassroomsLoaded] = useState(false);

  // Carregar turmas ao chegar na etapa 5
  const carregarTurmas = useCallback(async () => {
    if (classroomsLoaded) return;
    try {
      const res = await http.get('/lookup/classrooms/accessible');
      setClassrooms(Array.isArray(res.data) ? res.data : []);
      setClassroomsLoaded(true);
    } catch {
      setClassrooms([]);
      setClassroomsLoaded(true);
    }
  }, [classroomsLoaded]);

  const avancar = async () => {
    if (etapa === 5) await carregarTurmas();
    if (etapa < 6) { setEtapa(e => e + 1); return; }
    // Etapa 6 = salvar
    await salvar();
  };

  const voltar = () => { if (etapa > 1) setEtapa(e => e - 1); };

  const salvar = async () => {
    setSalvando(true);
    try {
      // 1. Criar a criança
      const payload = {
        ...crianca,
        nomeMae: responsavel.relacao === 'MAE' ? responsavel.nome : undefined,
        nomePai: responsavel.relacao === 'PAI' ? responsavel.nome : undefined,
        celPai: responsavel.telefone,
        ...saude,
        usoImagem: documentos.usoImagem,
      };
      const res = await http.post('/children', payload);
      const id = res.data?.id ?? res.data?.child?.id;
      if (!id) throw new Error('ID da criança não retornado pela API.');
      setChildId(id);

      // 2. Criar a matrícula se turma selecionada
      if (turma.classroomId) {
        await http.post(`/children/${id}/enrollment`, {
          classroomId: turma.classroomId,
          enrollmentDate: turma.enrollmentDate,
        });
      }

      toast.success('Matrícula realizada com sucesso!');
      navigate('/app/secretaria/matriculas');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  };

  const podeAvancar = () => {
    if (etapa === 1) return crianca.firstName.trim() !== '' && crianca.lastName.trim() !== '' && crianca.dateOfBirth !== '';
    if (etapa === 2) return responsavel.nome.trim() !== '' && responsavel.telefone.trim() !== '';
    return true;
  };

  return (
    <PageShell
      title="Nova Matrícula"
      description="Cadastre uma nova criança em 6 etapas"
    >
      {/* ── Indicador de etapas ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {ETAPAS.map((e, idx) => (
          <div key={e.id} className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => etapa > e.id && setEtapa(e.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                etapa === e.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : etapa > e.id
                  ? 'bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-400 cursor-default'
              }`}
            >
              {etapa > e.id ? <CheckCircle className="h-3.5 w-3.5" /> : e.icon}
              <span className="hidden sm:inline">{e.label}</span>
            </button>
            {idx < ETAPAS.length - 1 && (
              <ChevronRight className="h-3 w-3 text-slate-300 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* ── Conteúdo da etapa ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        {etapa === 1 && (
          <EtapaCrianca dados={crianca} onChange={setCrianca} />
        )}
        {etapa === 2 && (
          <EtapaResponsavel dados={responsavel} onChange={setResponsavel} />
        )}
        {etapa === 3 && (
          <EtapaSaude dados={saude} onChange={setSaude} />
        )}
        {etapa === 4 && (
          <EtapaDocumentos dados={documentos} onChange={setDocumentos} />
        )}
        {etapa === 5 && (
          <EtapaTurma dados={turma} onChange={setTurma} classrooms={classrooms} />
        )}
        {etapa === 6 && (
          <EtapaRevisao
            crianca={crianca}
            responsavel={responsavel}
            saude={saude}
            documentos={documentos}
            turma={turma}
            classrooms={classrooms}
          />
        )}
      </div>

      {/* ── Navegação ── */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={etapa === 1 ? () => navigate('/app/secretaria') : voltar}
          className="flex items-center gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" />
          {etapa === 1 ? 'Cancelar' : 'Voltar'}
        </Button>
        <Button
          onClick={avancar}
          disabled={!podeAvancar() || salvando}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
        >
          {salvando ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
          ) : etapa === 6 ? (
            <><CheckCircle className="h-4 w-4" /> Confirmar Matrícula</>
          ) : (
            <>Próximo <ChevronRight className="h-4 w-4" /></>
          )}
        </Button>
      </div>
    </PageShell>
  );
}

// ─── Etapa 1 — Dados da Criança ───────────────────────────────────────────────

function EtapaCrianca({ dados, onChange }: { dados: DadosCrianca; onChange: (d: DadosCrianca) => void }) {
  const set = (k: keyof DadosCrianca) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...dados, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Dados da Criança</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Nome *" required>
          <input className={inputCls} value={dados.firstName} onChange={set('firstName')} placeholder="Nome" />
        </FormField>
        <FormField label="Sobrenome *" required>
          <input className={inputCls} value={dados.lastName} onChange={set('lastName')} placeholder="Sobrenome" />
        </FormField>
        <FormField label="Data de Nascimento *" required>
          <input type="date" className={inputCls} value={dados.dateOfBirth} onChange={set('dateOfBirth')} />
        </FormField>
        <FormField label="Gênero">
          <select className={inputCls} value={dados.gender} onChange={set('gender')}>
            <option value="NAO_INFORMADO">Não informado</option>
            <option value="MASCULINO">Masculino</option>
            <option value="FEMININO">Feminino</option>
          </select>
        </FormField>
        <FormField label="CPF">
          <input className={inputCls} value={dados.cpf} onChange={set('cpf')} placeholder="000.000.000-00" />
        </FormField>
        <FormField label="RG">
          <input className={inputCls} value={dados.rg} onChange={set('rg')} placeholder="RG" />
        </FormField>
        <FormField label="Raça/Cor">
          <select className={inputCls} value={dados.raca} onChange={set('raca')}>
            <option value="">Não informado</option>
            <option value="Branca">Branca</option>
            <option value="Preta">Preta</option>
            <option value="Parda">Parda</option>
            <option value="Amarela">Amarela</option>
            <option value="Indígena">Indígena</option>
          </select>
        </FormField>
        <FormField label="NIS">
          <input className={inputCls} value={dados.nis} onChange={set('nis')} placeholder="NIS" />
        </FormField>
        <FormField label="Código do Aluno">
          <input className={inputCls} value={dados.codigoAluno} onChange={set('codigoAluno')} placeholder="Código" />
        </FormField>
        <FormField label="Inscrição">
          <input className={inputCls} value={dados.inscricao} onChange={set('inscricao')} placeholder="Inscrição" />
        </FormField>
      </div>
    </div>
  );
}

// ─── Etapa 2 — Responsáveis ───────────────────────────────────────────────────

function EtapaResponsavel({ dados, onChange }: { dados: Responsavel; onChange: (d: Responsavel) => void }) {
  const set = (k: keyof Responsavel) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...dados, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Responsável Principal</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Nome do Responsável *" required>
          <input className={inputCls} value={dados.nome} onChange={set('nome')} placeholder="Nome completo" />
        </FormField>
        <FormField label="Relação">
          <select className={inputCls} value={dados.relacao} onChange={set('relacao')}>
            <option value="MAE">Mãe</option>
            <option value="PAI">Pai</option>
            <option value="AVO">Avó/Avô</option>
            <option value="TUTOR">Tutor(a)</option>
            <option value="OUTRO">Outro</option>
          </select>
        </FormField>
        <FormField label="CPF">
          <input className={inputCls} value={dados.cpf} onChange={set('cpf')} placeholder="000.000.000-00" />
        </FormField>
        <FormField label="Telefone *" required>
          <input className={inputCls} value={dados.telefone} onChange={set('telefone')} placeholder="(00) 00000-0000" />
        </FormField>
        <FormField label="E-mail">
          <input type="email" className={inputCls} value={dados.email} onChange={set('email')} placeholder="email@exemplo.com" />
        </FormField>
        <FormField label="CEP">
          <input className={inputCls} value={dados.cep} onChange={set('cep')} placeholder="00000-000" />
        </FormField>
        <FormField label="Endereço">
          <input className={inputCls} value={dados.endereco} onChange={set('endereco')} placeholder="Rua, número" />
        </FormField>
        <FormField label="Bairro">
          <input className={inputCls} value={dados.bairro} onChange={set('bairro')} placeholder="Bairro" />
        </FormField>
        <FormField label="Cidade">
          <input className={inputCls} value={dados.cidade} onChange={set('cidade')} placeholder="Cidade" />
        </FormField>
      </div>
    </div>
  );
}

// ─── Etapa 3 — Saúde ─────────────────────────────────────────────────────────

function EtapaSaude({ dados, onChange }: { dados: DadosSaude; onChange: (d: DadosSaude) => void }) {
  const set = (k: keyof DadosSaude) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    onChange({ ...dados, [k]: e.target.value });
  const setCheck = (k: keyof DadosSaude) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...dados, [k]: e.target.checked });

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Saúde e Necessidades Especiais</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Tipo Sanguíneo">
          <select className={inputCls} value={dados.bloodType} onChange={set('bloodType')}>
            <option value="">Não informado</option>
            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Alergias">
          <input className={inputCls} value={dados.allergies} onChange={set('allergies')} placeholder="Descreva alergias" />
        </FormField>
        <FormField label="Condições Médicas">
          <input className={inputCls} value={dados.medicalConditions} onChange={set('medicalConditions')} placeholder="Ex.: asma, diabetes" />
        </FormField>
        <FormField label="Medicamentos em Uso">
          <input className={inputCls} value={dados.medicationNeeds} onChange={set('medicationNeeds')} placeholder="Medicamentos" />
        </FormField>
        <FormField label="Contato de Emergência">
          <input className={inputCls} value={dados.emergencyContactName} onChange={set('emergencyContactName')} placeholder="Nome" />
        </FormField>
        <FormField label="Telefone de Emergência">
          <input className={inputCls} value={dados.emergencyContactPhone} onChange={set('emergencyContactPhone')} placeholder="(00) 00000-0000" />
        </FormField>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="laudado"
          checked={dados.laudado}
          onChange={setCheck('laudado')}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <label htmlFor="laudado" className="text-sm text-slate-700">Criança com laudo médico</label>
      </div>
      {dados.laudado && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 pl-6 border-l-2 border-brand-200">
          <FormField label="Tipo de Laudo">
            <input className={inputCls} value={dados.tipoLaudo} onChange={set('tipoLaudo')} placeholder="Ex.: TEA, TDAH" />
          </FormField>
          <FormField label="CID">
            <input className={inputCls} value={dados.cid} onChange={set('cid')} placeholder="CID-10" />
          </FormField>
          <FormField label="Descrição do Laudo" className="sm:col-span-2">
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={dados.descricaoLaudo}
              onChange={set('descricaoLaudo')}
              placeholder="Descrição detalhada"
            />
          </FormField>
        </div>
      )}
    </div>
  );
}

// ─── Etapa 4 — Documentos ─────────────────────────────────────────────────────

function EtapaDocumentos({ dados, onChange }: { dados: DadosDocumentos; onChange: (d: DadosDocumentos) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Documentos e Autorizações</h2>
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <input
            type="checkbox"
            id="usoImagem"
            checked={dados.usoImagem}
            onChange={(e) => onChange({ ...dados, usoImagem: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <div>
            <label htmlFor="usoImagem" className="text-sm font-medium text-slate-700 cursor-pointer">
              Autorização de uso de imagem
            </label>
            <p className="text-xs text-slate-400 mt-0.5">
              Autorizo o uso da imagem da criança em materiais institucionais, redes sociais e publicações da unidade.
            </p>
          </div>
        </div>
        <FormField label="Observações adicionais">
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            value={dados.observacoes}
            onChange={(e) => onChange({ ...dados, observacoes: e.target.value })}
            placeholder="Informações adicionais relevantes para a secretaria..."
          />
        </FormField>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
          <p className="font-medium mb-1">Documentos físicos necessários:</p>
          <ul className="space-y-0.5 list-disc list-inside text-blue-600">
            <li>Certidão de nascimento</li>
            <li>Cartão de vacinação atualizado</li>
            <li>Comprovante de residência</li>
            <li>Documento do responsável (RG/CPF)</li>
            <li>Laudo médico (se aplicável)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Etapa 5 — Turma ─────────────────────────────────────────────────────────

function EtapaTurma({
  dados, onChange, classrooms,
}: {
  dados: DadosTurma;
  onChange: (d: DadosTurma) => void;
  classrooms: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Turma e Unidade</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Turma">
          <select
            className={inputCls}
            value={dados.classroomId}
            onChange={(e) => onChange({ ...dados, classroomId: e.target.value })}
          >
            <option value="">Selecione uma turma (opcional)</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Data de Matrícula">
          <input
            type="date"
            className={inputCls}
            value={dados.enrollmentDate}
            onChange={(e) => onChange({ ...dados, enrollmentDate: e.target.value })}
          />
        </FormField>
      </div>
      {classrooms.length === 0 && (
        <p className="text-xs text-slate-400 italic">
          Nenhuma turma disponível. A criança será cadastrada sem turma e poderá ser matriculada posteriormente.
        </p>
      )}
    </div>
  );
}

// ─── Etapa 6 — Revisão ───────────────────────────────────────────────────────

function EtapaRevisao({
  crianca, responsavel, saude, documentos, turma, classrooms,
}: {
  crianca: DadosCrianca;
  responsavel: Responsavel;
  saude: DadosSaude;
  documentos: DadosDocumentos;
  turma: DadosTurma;
  classrooms: { id: string; name: string }[];
}) {
  const turmaNome = classrooms.find(c => c.id === turma.classroomId)?.name ?? 'Sem turma';

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-slate-800">Revisão — Confirme os dados antes de salvar</h2>

      <RevisaoBloco titulo="Criança">
        <RevisaoLinha label="Nome" value={`${crianca.firstName} ${crianca.lastName}`} />
        <RevisaoLinha label="Nascimento" value={crianca.dateOfBirth} />
        <RevisaoLinha label="Gênero" value={crianca.gender} />
        {crianca.cpf && <RevisaoLinha label="CPF" value={crianca.cpf} />}
        {crianca.raca && <RevisaoLinha label="Raça/Cor" value={crianca.raca} />}
      </RevisaoBloco>

      <RevisaoBloco titulo="Responsável">
        <RevisaoLinha label="Nome" value={responsavel.nome} />
        <RevisaoLinha label="Relação" value={responsavel.relacao} />
        <RevisaoLinha label="Telefone" value={responsavel.telefone} />
        {responsavel.email && <RevisaoLinha label="E-mail" value={responsavel.email} />}
      </RevisaoBloco>

      <RevisaoBloco titulo="Saúde">
        {saude.bloodType && <RevisaoLinha label="Tipo Sanguíneo" value={saude.bloodType} />}
        {saude.allergies && <RevisaoLinha label="Alergias" value={saude.allergies} />}
        {saude.medicalConditions && <RevisaoLinha label="Condições" value={saude.medicalConditions} />}
        <RevisaoLinha label="Laudo" value={saude.laudado ? `Sim — ${saude.tipoLaudo || 'tipo não especificado'}` : 'Não'} />
        {saude.emergencyContactName && <RevisaoLinha label="Emergência" value={`${saude.emergencyContactName} · ${saude.emergencyContactPhone}`} />}
      </RevisaoBloco>

      <RevisaoBloco titulo="Documentos">
        <RevisaoLinha label="Uso de imagem" value={documentos.usoImagem ? 'Autorizado' : 'Não autorizado'} />
        {documentos.observacoes && <RevisaoLinha label="Observações" value={documentos.observacoes} />}
      </RevisaoBloco>

      <RevisaoBloco titulo="Turma">
        <RevisaoLinha label="Turma" value={turmaNome} />
        <RevisaoLinha label="Data de matrícula" value={turma.enrollmentDate} />
      </RevisaoBloco>
    </div>
  );
}

// ─── Utilitários de UI ────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors';

function FormField({ label, required, children, className }: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-500 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function RevisaoBloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-600">{titulo}</p>
      </div>
      <div className="divide-y divide-slate-50">{children}</div>
    </div>
  );
}

function RevisaoLinha({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2">
      <span className="text-xs text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-xs text-slate-700 text-right font-medium">{value}</span>
    </div>
  );
}
