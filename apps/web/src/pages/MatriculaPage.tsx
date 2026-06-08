/**
 * MatriculaPage — Nova Matrícula Administrativa da Secretaria
 *
 * Formulário baseado nas planilhas oficiais da unidade:
 * COD. ALUNO, INSCRIÇÃO, dados pessoais, responsáveis, endereço, saúde,
 * documentação, autorização de imagem, transporte, pessoas autorizadas e turma.
 *
 * Persiste dados nativos no Child e guarda dossiês administrativos em JSON
 * aditivo para futura ficha/PDF sem perder informação.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Camera,
  GraduationCap,
  Heart,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../app/AuthProvider';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { PageShell } from '../components/ui/PageShell';
import { Button } from '../components/ui/button';
import { ChildAvatar } from '../components/children/ChildAvatar';

type Genero = 'MASCULINO' | 'FEMININO' | 'OUTRO' | 'NAO_INFORMADO';

interface ResponsavelForm {
  nome: string;
  parentesco: string;
  cpf: string;
  identidade: string;
  orgaoExpeditor: string;
  dataDocumento: string;
  pis: string;
  nascimento: string;
  telefoneTrabalho: string;
  telefoneResidencial: string;
  celular: string;
  email: string;
  escolaridade: string;
  profissao: string;
  dependentes: string;
  endereco: string;
  cep: string;
  beneficio: string;
  pessoasCasa: string;
}

interface AutorizadoForm {
  nome: string;
  parentesco: string;
  telefone: string;
}

interface DocumentoAnexo {
  nome: string;
  url: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
}

interface DocumentosMatricula {
  certidaoNascimento: boolean;
  cpfCrianca: boolean;
  rgCpfResponsavel: boolean;
  comprovanteResidencia: boolean;
  cartaoVacina: boolean;
  cartaoSUS: boolean;
  nis: boolean;
  laudoMedico: boolean;
  foto: boolean;
  termoImagem: boolean;
  declaracaoEscolar: boolean;
  anexos?: Record<string, DocumentoAnexo[]>;
}

interface FormularioMatricula {
  codigoAluno: string;
  inscricao: string;
  firstName: string;
  lastName: string;
  gender: Genero;
  dateOfBirth: string;
  nacionalidade: string;
  naturalidade: string;
  ufNascimento: string;
  cpf: string;
  rg: string;
  raca: string;
  peso: string;
  bloodType: string;
  endereco: string;
  cep: string;
  nis: string;
  photoUrl: string;
  nomeMae: string;
  nomePai: string;
  mae: ResponsavelForm;
  pai: ResponsavelForm;
  responsavelLegal: ResponsavelForm;
  intolerancias: string;
  allergies: string;
  medicalConditions: string;
  medicationNeeds: string;
  medicamentos: string;
  laudado: boolean;
  tipoLaudo: string;
  cid: string;
  descricaoLaudo: string;
  genitor: boolean;
  usoImagem: boolean;
  serieAnterior: string;
  transporteEscolar: boolean;
  nomeTransporte: string;
  autorizados: AutorizadoForm[];
  documentos: DocumentosMatricula;
  classroomId: string;
  enrollmentId: string;
  enrollmentDate: string;
  observacoesSecretaria: string;
}

interface Turma {
  id: string;
  name: string;
}

interface EnrollmentResumo {
  id?: string;
  status?: string;
  classroomId?: string;
  enrollmentDate?: string;
  classroom?: { id?: string; name?: string };
}

interface EmpresaTransporte {
  id: string;
  nome: string;
}

const STORAGE_KEY = 'conexa:secretaria:nova-matricula:v2';

const DOCUMENTOS_CHECKLIST: Array<{ key: keyof Omit<DocumentosMatricula, 'anexos'>; label: string }> = [
  { key: 'certidaoNascimento', label: 'Certidão de nascimento' },
  { key: 'cpfCrianca', label: 'CPF da criança' },
  { key: 'rgCpfResponsavel', label: 'RG/CPF do responsável' },
  { key: 'comprovanteResidencia', label: 'Comprovante de residência' },
  { key: 'cartaoVacina', label: 'Cartão de vacinação' },
  { key: 'cartaoSUS', label: 'Cartão SUS' },
  { key: 'nis', label: 'NIS' },
  { key: 'laudoMedico', label: 'Laudo médico' },
  { key: 'foto', label: 'Foto' },
  { key: 'termoImagem', label: 'Termo de uso de imagem' },
  { key: 'declaracaoEscolar', label: 'Declaração escolar' },
];

const ETAPAS = [
  { id: 1, label: 'Criança', icon: <User className="h-4 w-4" /> },
  { id: 2, label: 'Responsáveis', icon: <Users className="h-4 w-4" /> },
  { id: 3, label: 'Saúde', icon: <Heart className="h-4 w-4" /> },
  { id: 4, label: 'Documentos', icon: <FileText className="h-4 w-4" /> },
  { id: 5, label: 'Turma', icon: <GraduationCap className="h-4 w-4" /> },
  { id: 6, label: 'Revisão', icon: <ClipboardCheck className="h-4 w-4" /> },
];

const responsavelVazio: ResponsavelForm = {
  nome: '',
  parentesco: '',
  cpf: '',
  identidade: '',
  orgaoExpeditor: '',
  dataDocumento: '',
  pis: '',
  nascimento: '',
  telefoneTrabalho: '',
  telefoneResidencial: '',
  celular: '',
  email: '',
  escolaridade: '',
  profissao: '',
  dependentes: '',
  endereco: '',
  cep: '',
  beneficio: '',
  pessoasCasa: '',
};

function estadoInicial(): FormularioMatricula {
  return {
    codigoAluno: '',
    inscricao: '',
    firstName: '',
    lastName: '',
    gender: 'NAO_INFORMADO',
    dateOfBirth: '',
    nacionalidade: 'BRASIL',
    naturalidade: '',
    ufNascimento: 'DF',
    cpf: '',
    rg: '',
    raca: '',
    peso: '',
    bloodType: '',
    endereco: '',
    cep: '',
    nis: '',
    photoUrl: '',
    nomeMae: '',
    nomePai: '',
    mae: { ...responsavelVazio, parentesco: 'MÃE' },
    pai: { ...responsavelVazio, parentesco: 'PAI' },
    responsavelLegal: { ...responsavelVazio, parentesco: 'RESPONSÁVEL' },
    intolerancias: '',
    allergies: '',
    medicalConditions: '',
    medicationNeeds: '',
    medicamentos: '',
    laudado: false,
    tipoLaudo: '',
    cid: '',
    descricaoLaudo: '',
    genitor: false,
    usoImagem: false,
    serieAnterior: '',
    transporteEscolar: false,
    nomeTransporte: '',
    autorizados: [
      { nome: '', parentesco: '', telefone: '' },
      { nome: '', parentesco: '', telefone: '' },
    ],
    documentos: {
      certidaoNascimento: false,
      cpfCrianca: false,
      rgCpfResponsavel: false,
      comprovanteResidencia: false,
      cartaoVacina: false,
      cartaoSUS: false,
      nis: false,
      laudoMedico: false,
      foto: false,
      termoImagem: false,
      declaracaoEscolar: false,
      anexos: {},
    },
    classroomId: '',
    enrollmentId: '',
    enrollmentDate: new Date().toISOString().slice(0, 10),
    observacoesSecretaria: '',
  };
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function cleanText(value: string | undefined) {
  const cleaned = (value ?? '').replace(/\s+/g, ' ').trim();
  return cleaned || undefined;
}

function splitName(nomeCompleto: string) {
  const partes = nomeCompleto.trim().replace(/\s+/g, ' ').split(' ');
  if (partes.length <= 1) return { firstName: partes[0] ?? '', lastName: '' };
  return { firstName: partes[0], lastName: partes.slice(1).join(' ') };
}

function isValidEmail(email: string) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function compactObject<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ) as T;
}

function asObj(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'string') {
    try { return asObj(JSON.parse(value)); } catch { return {}; }
  }
  return typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray<T = any>(value: any): T[] {
  if (!value) return [];
  if (typeof value === 'string') {
    try { return asArray(JSON.parse(value)); } catch { return []; }
  }
  return Array.isArray(value) ? value : [];
}

function firstValue(...values: any[]): string {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized && normalized !== '—') return normalized;
  }
  return '';
}

function readRaw(raw: Record<string, any>, ...keys: string[]): string {
  for (const key of keys) {
    const direct = firstValue(raw[key]);
    if (direct) return direct;
    const found = Object.keys(raw).find((candidate) => candidate.trim().toLowerCase() === key.trim().toLowerCase());
    if (found) {
      const value = firstValue(raw[found]);
      if (value) return value;
    }
  }
  return '';
}

function asBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return false;
  const normalized = String(value).trim().toLowerCase();
  if (['sim', 's', 'true', '1', 'yes'].includes(normalized)) return true;
  if (['não', 'nao', 'n', 'false', '0', 'no'].includes(normalized)) return false;
  return Boolean(value);
}

function hidratarResponsavel(base: ResponsavelForm, dados: any, nomePrincipal?: string, raw: Record<string, any> = {}, prefixo = ''): ResponsavelForm {
  const d = asObj(dados);
  const rawKey = (campo: string) => prefixo ? readRaw(raw, `${campo} ${prefixo}`, `${prefixo} ${campo}`) : '';
  return {
    ...base,
    nome: firstValue(d.nome, d.name, nomePrincipal, base.nome),
    parentesco: firstValue(d.parentesco, d.relationship, base.parentesco),
    cpf: firstValue(d.cpf, d.documentoCpf, rawKey('CPF'), base.cpf),
    identidade: firstValue(d.identidade, d.rg, d.documento, d.documentoIdentidade, rawKey('IDENTIDADE'), base.identidade),
    orgaoExpeditor: firstValue(d.orgaoExpeditor, d.orgaoExpedidor, d.orgao, rawKey('ORG. EXPEDITOR'), rawKey('ÓRGÃO EXPEDIDOR'), base.orgaoExpeditor),
    dataDocumento: firstValue(d.dataDocumento, d.dataEmissao, rawKey('DATA'), base.dataDocumento),
    pis: firstValue(d.pis, d.pisResponsavel, base.pis),
    nascimento: firstValue(d.nascimento, d.dataNascimento, d.dateOfBirth, rawKey('NASCIMENTO'), base.nascimento),
    telefoneTrabalho: firstValue(d.telefoneTrabalho, d.telefoneComercial, rawKey('TE. TRABALHO'), rawKey('TELEFONE TRABALHO'), base.telefoneTrabalho),
    telefoneResidencial: firstValue(d.telefoneResidencial, d.telefone, d.phone, rawKey('TEL. RESIDENCIAL'), rawKey('TELEFONE RESIDENCIAL'), base.telefoneResidencial),
    celular: firstValue(d.celular, d.whatsapp, d.telefoneCelular, rawKey('CEL.'), rawKey('CELULAR'), base.celular),
    email: firstValue(d.email, d.eMail, base.email),
    escolaridade: firstValue(d.escolaridade, rawKey('ESCOLARIDADE'), base.escolaridade),
    profissao: firstValue(d.profissao, d.ocupacao, rawKey('PROFISSÃO'), rawKey('PROFISSAO'), base.profissao),
    dependentes: firstValue(d.dependentes, d.numeroDependentes, rawKey('Nº DEPENDENTES'), rawKey('DEPENDENTES'), base.dependentes),
    endereco: firstValue(d.endereco, d.address, rawKey('ENDEREÇO'), rawKey('ENDERECO'), base.endereco),
    cep: firstValue(d.cep, rawKey('CEP'), base.cep),
    beneficio: firstValue(d.beneficio, d.benefício, rawKey('BENEFÍCIO'), rawKey('BENEFICIO'), base.beneficio),
    pessoasCasa: firstValue(d.pessoasCasa, d.numeroPessoasCasa, d.moradores, rawKey('Nº PESSOAS EM CASA'), rawKey('PESSOAS EM CASA'), base.pessoasCasa),
  };
}

function normalizeDocumentos(value: any, defaults: DocumentosMatricula): DocumentosMatricula {
  const d = asObj(value);
  return {
    ...defaults,
    certidaoNascimento: asBoolean(d.certidaoNascimento ?? d.certidao ?? defaults.certidaoNascimento),
    cpfCrianca: asBoolean(d.cpfCrianca ?? d.cpfOriginalAluno ?? defaults.cpfCrianca),
    rgCpfResponsavel: asBoolean(d.rgCpfResponsavel ?? d.cpfResponsavel ?? d.rgResponsavel ?? defaults.rgCpfResponsavel),
    comprovanteResidencia: asBoolean(d.comprovanteResidencia ?? defaults.comprovanteResidencia),
    cartaoVacina: asBoolean(d.cartaoVacina ?? d.vacina ?? defaults.cartaoVacina),
    cartaoSUS: asBoolean(d.cartaoSUS ?? d.sus ?? defaults.cartaoSUS),
    nis: asBoolean(d.nis ?? defaults.nis),
    laudoMedico: asBoolean(d.laudoMedico ?? d.laudo ?? defaults.laudoMedico),
    foto: asBoolean(d.foto ?? defaults.foto),
    termoImagem: asBoolean(d.termoImagem ?? d.usoImagem ?? defaults.termoImagem),
    declaracaoEscolar: asBoolean(d.declaracaoEscolar ?? defaults.declaracaoEscolar),
    anexos: asObj(d.anexos ?? defaults.anexos),
  };
}

function normalizeAutorizados(value: any): AutorizadoForm[] {
  const normalized = asArray(value).map((item) => {
    const d = asObj(item);
    return {
      nome: firstValue(d.nome, d.name),
      parentesco: firstValue(d.parentesco, d.relationship, d.relacao, d.relação),
      telefone: firstValue(d.telefone, d.celular, d.phone),
    };
  }).filter((a) => a.nome);
  while (normalized.length < 2) normalized.push({ nome: '', parentesco: '', telefone: '' });
  return normalized;
}

function buildFormularioFromChild(c: any): FormularioMatricula {
  const inicial = estadoInicial();
  const dad = asObj(c?.dadosResponsaveis);
  const ficha = asObj(c?.fichaAdministrativa);
  const raw = asObj(ficha.raw);
  const docs = asObj(c?.documentosMatricula);
  const transporte = asObj(c?.transporteEscolar);
  const matriculaPrincipal = obterMatriculaPrincipal(c?.enrollments);
  const mae = hidratarResponsavel(inicial.mae, dad.mae, firstValue(c?.nomeMae, readRaw(raw, 'MÃE', 'MAE')), raw, 'MÃE');
  const pai = hidratarResponsavel(inicial.pai, dad.pai, firstValue(c?.nomePai, readRaw(raw, 'PAI')), raw, 'PAI');
  const responsavelLegal = hidratarResponsavel(
    inicial.responsavelLegal,
    dad.responsavelLegal ?? dad.responsavelPrincipal,
    firstValue(c?.emergencyContactName, dad.responsavelLegal?.nome, dad.responsavelPrincipal?.nome, mae.nome),
    raw,
    'RESP'
  );

  return {
    ...inicial,
    firstName: firstValue(c?.firstName),
    lastName: firstValue(c?.lastName),
    dateOfBirth: c?.dateOfBirth ? String(c.dateOfBirth).slice(0, 10) : '',
    gender: (firstValue(c?.gender) || 'NAO_INFORMADO') as Genero,
    cpf: firstValue(c?.cpf, readRaw(raw, 'CPF', 'CPF DA CRIANÇA')),
    rg: firstValue(c?.rg, docs.rgCrianca, readRaw(raw, 'RG')),
    nacionalidade: firstValue(c?.nacionalidade, ficha.nacionalidade, readRaw(raw, 'NACIONALIDADE'), inicial.nacionalidade),
    naturalidade: firstValue(c?.naturalidade, ficha.naturalidade, readRaw(raw, 'NATURALIDADE')),
    ufNascimento: firstValue(c?.ufNascimento, ficha.ufNascimento, readRaw(raw, 'UF', 'UF NASCIMENTO')).toUpperCase().slice(0, 2),
    raca: firstValue(c?.raca, readRaw(raw, 'RAÇA/COR', 'RACA/COR', 'RAÇA', 'RACA')),
    peso: firstValue(c?.peso, readRaw(raw, 'PESO')),
    bloodType: firstValue(c?.bloodType, readRaw(raw, 'TIPO SANGUÍNEO', 'TIPO SANGUINEO')),
    endereco: firstValue(c?.endereco, ficha.endereco, readRaw(raw, 'ENDEREÇO', 'ENDERECO'), mae.endereco, pai.endereco, responsavelLegal.endereco),
    cep: firstValue(c?.cep, ficha.cep, readRaw(raw, 'CEP'), mae.cep, pai.cep, responsavelLegal.cep),
    nis: firstValue(c?.nis, docs.nis, readRaw(raw, 'NIS')),
    photoUrl: firstValue(c?.photoUrl),
    codigoAluno: firstValue(c?.codigoAluno, readRaw(raw, 'COD. ALUNO', 'CÓD. ALUNO', 'CODIGO ALUNO')),
    inscricao: firstValue(c?.inscricao, readRaw(raw, 'INSCRIÇÃO', 'INSCRICAO')),
    nomeMae: firstValue(c?.nomeMae, mae.nome),
    nomePai: firstValue(c?.nomePai, pai.nome),
    mae,
    pai,
    responsavelLegal,
    allergies: firstValue(c?.allergies, ficha.alergias, readRaw(raw, 'ALERGIAS')),
    intolerancias: firstValue(ficha.intolerancias, readRaw(raw, 'INTOLERÂNCIAS', 'INTOLERANCIAS')),
    medicalConditions: firstValue(c?.medicalConditions, ficha.condicoesMedicas, readRaw(raw, 'CONDIÇÕES MÉDICAS', 'CONDICOES MEDICAS')),
    medicationNeeds: firstValue(c?.medicationNeeds, ficha.necessidadesMedicacao, readRaw(raw, 'NECESSIDADES DE MEDICAÇÃO', 'NECESSIDADES DE MEDICACAO')),
    medicamentos: firstValue(c?.medicamentos, ficha.medicamentos, readRaw(raw, 'MEDICAMENTOS')),
    laudado: asBoolean(c?.laudado ?? ficha.laudado),
    tipoLaudo: firstValue(c?.tipoLaudo, ficha.tipoLaudo),
    cid: firstValue(c?.cid, ficha.cid),
    descricaoLaudo: firstValue(c?.descricaoLaudo, ficha.descricaoLaudo),
    genitor: asBoolean(ficha.genitor),
    usoImagem: asBoolean(c?.usoImagem ?? ficha.usoImagem ?? docs.termoImagem),
    serieAnterior: firstValue(ficha.serieAnterior, readRaw(raw, 'SÉRIE ANTERIOR', 'SERIE ANTERIOR')),
    transporteEscolar: asBoolean(transporte.utiliza ?? transporte.usaTransporteEscolar),
    nomeTransporte: firstValue(transporte.nomeTransporte, transporte.empresa, transporte.nomeEmpresa),
    autorizados: normalizeAutorizados(c?.autorizadosRetirada),
    documentos: normalizeDocumentos(c?.documentosMatricula, inicial.documentos),
    enrollmentDate: firstValue(matriculaPrincipal?.enrollmentDate?.slice?.(0, 10), inicial.enrollmentDate),
    classroomId: firstValue(matriculaPrincipal?.classroomId, matriculaPrincipal?.classroom?.id),
    enrollmentId: firstValue(matriculaPrincipal?.id),
    observacoesSecretaria: firstValue(ficha.observacoesSecretaria, ficha.observacoes),
  };
}

function obterMatriculaPrincipal(enrollments?: EnrollmentResumo[]): EnrollmentResumo | undefined {
  if (!Array.isArray(enrollments) || enrollments.length === 0) return undefined;
  return enrollments.find((e) => e.status === 'ATIVA') ?? enrollments[0];
}

export default function MatriculaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: childIdParam } = useParams<{ id: string }>();
  const modoEdicao = Boolean(childIdParam);
  const isNova = location.pathname.endsWith('/nova');
  const { user } = useAuth();
  const [etapa, setEtapa] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [enviandoDocumento, setEnviandoDocumento] = useState<string | null>(null);
  const [carregandoDados, setCarregandoDados] = useState(modoEdicao);
  const [form, setForm] = useState<FormularioMatricula>(() => {
    if (modoEdicao) return estadoInicial();
    if (location.pathname.endsWith('/nova')) {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      return estadoInicial();
    }
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      return salvo ? { ...estadoInicial(), ...JSON.parse(salvo) } : estadoInicial();
    } catch {
      return estadoInicial();
    }
  });
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmasCarregadas, setTurmasCarregadas] = useState(false);
  const [empresasTransporte, setEmpresasTransporte] = useState<EmpresaTransporte[]>([]);
  const [empresasCarregadas, setEmpresasCarregadas] = useState(false);

  const unitId = (user as any)?.unitId ?? (user as any)?.unit?.id ?? '';

  // Carregar dados do aluno em modo edição.
  // Não usa rascunho local e não faz hidratação parcial: usa campos nativos + JSONs administrativos.
  useEffect(() => {
    if (!modoEdicao || !childIdParam) return;
    setCarregandoDados(true);
    http.get(`/children/${childIdParam}`, { params: { _ts: Date.now() } })
      .then((res) => setForm(buildFormularioFromChild(res.data)))
      .catch(() => {
        toast.error('Erro ao carregar dados do aluno.');
        navigate('/app/secretaria/matriculas');
      })
      .finally(() => setCarregandoDados(false));
  }, [childIdParam, modoEdicao, navigate]);

  useEffect(() => {
    // Só salva rascunho em modo criação — nunca em modo edição
    if (!modoEdicao && !isNova) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    }
  }, [form, modoEdicao, isNova]);

  const atualizar = <K extends keyof FormularioMatricula>(campo: K, valor: FormularioMatricula[K]) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  };

  const atualizarResponsavel = (tipo: 'mae' | 'pai' | 'responsavelLegal', campo: keyof ResponsavelForm, valor: string) => {
    setForm((atual) => ({
      ...atual,
      [tipo]: { ...atual[tipo], [campo]: valor },
    }));
  };

  const atualizarDocumento = (campo: keyof Omit<DocumentosMatricula, 'anexos'>, valor: boolean) => {
    setForm((atual) => ({
      ...atual,
      documentos: { ...atual.documentos, [campo]: valor },
    }));
  };

  const atualizarAutorizado = (index: number, campo: keyof AutorizadoForm, valor: string) => {
    setForm((atual) => {
      const autorizados = [...atual.autorizados];
      autorizados[index] = { ...autorizados[index], [campo]: valor };
      return { ...atual, autorizados };
    });
  };

  const enviarFotoAluno = async (file?: File | null) => {
    if (!file || !childIdParam) return;
    setEnviandoFoto(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await http.post(`/children/${childIdParam}/photo`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      const photoUrl = res.data?.photoUrl ?? '';
      setForm((atual) => ({
        ...atual,
        photoUrl,
        documentos: { ...atual.documentos, foto: true },
      }));
      toast.success('Foto do aluno enviada e vinculada à ficha.');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setEnviandoFoto(false);
    }
  };

  const enviarDocumentoAluno = async (tipo: keyof Omit<DocumentosMatricula, 'anexos'>, file?: File | null) => {
    if (!file || !childIdParam) return;
    setEnviandoDocumento(tipo);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('type', tipo);
      const res = await http.post(`/children/${childIdParam}/document`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      const documento = res.data?.documento as DocumentoAnexo | undefined;
      setForm((atual) => {
        const anexosAtuais = atual.documentos.anexos ?? {};
        return {
          ...atual,
          documentos: {
            ...atual.documentos,
            [tipo]: true,
            anexos: {
              ...anexosAtuais,
              [tipo]: documento ? [...(anexosAtuais[tipo] ?? []), documento] : (anexosAtuais[tipo] ?? []),
            },
          },
        };
      });
      toast.success('Documento enviado e vinculado à matrícula.');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setEnviandoDocumento(null);
    }
  };

  const carregarTurmas = useCallback(async () => {
    if (turmasCarregadas) return;
    try {
      const res = await http.get('/lookup/classrooms/accessible');
      setTurmas(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTurmas([]);
    } finally {
      setTurmasCarregadas(true);
    }
  }, [turmasCarregadas]);

  const carregarEmpresasTransporte = useCallback(async () => {
    if (empresasCarregadas) return;
    try {
      const res = await http.get('/empresas-transporte', { params: { unitId: unitId || undefined } });
      setEmpresasTransporte(Array.isArray(res.data) ? res.data : []);
    } catch {
      setEmpresasTransporte([]);
    } finally {
      setEmpresasCarregadas(true);
    }
  }, [empresasCarregadas, unitId]);

  useEffect(() => {
    if (etapa === 4) void carregarEmpresasTransporte();
    if (etapa === 5) void carregarTurmas();
  }, [etapa, carregarEmpresasTransporte, carregarTurmas]);

  const cadastrarEmpresaTransporte = useCallback(async () => {
    const nome = form.nomeTransporte.trim();
    if (!nome) {
      toast.info('Informe o nome da empresa de transporte antes de cadastrar.');
      return;
    }
    try {
      const res = await http.post('/empresas-transporte', { nome, unitId: unitId || undefined });
      const nova = res.data as EmpresaTransporte;
      setEmpresasTransporte((atuais) => [...atuais.filter((e) => e.id !== nova.id), nova].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      atualizar('nomeTransporte', nova.nome);
      toast.success('Empresa de transporte cadastrada.');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [form.nomeTransporte, unitId]);

  const pendencias = useMemo(() => {
    const erros: string[] = [];

    if (!unitId) erros.push('Usuário sem unidade vinculada. A secretaria precisa estar vinculada a uma unidade.');
    if (!form.firstName.trim()) erros.push('Nome da criança é obrigatório.');
    if (!form.lastName.trim()) erros.push('Sobrenome da criança é obrigatório.');
    if (!form.dateOfBirth) erros.push('Data de nascimento é obrigatória.');
    if (form.cpf && onlyDigits(form.cpf).length !== 11) erros.push('CPF da criança deve ter 11 dígitos.');
    if (!form.nomeMae.trim() && !form.nomePai.trim() && !form.responsavelLegal.nome.trim()) {
      erros.push('Informe mãe, pai ou responsável legal.');
    }
    if (form.responsavelLegal.email && !isValidEmail(form.responsavelLegal.email)) {
      erros.push('E-mail do responsável legal está inválido.');
    }
    if (form.responsavelLegal.cpf && onlyDigits(form.responsavelLegal.cpf).length !== 11) {
      erros.push('CPF do responsável legal deve ter 11 dígitos.');
    }
    if (form.laudado && !form.tipoLaudo.trim()) erros.push('Tipo de laudo é obrigatório quando a criança é laudada.');
    if (!form.enrollmentDate) erros.push('Data de matrícula é obrigatória.');

    return erros;
  }, [form, unitId]);

  const podeAvancar = () => {
    if (etapa === 1) return form.firstName.trim() && form.lastName.trim() && form.dateOfBirth;
    if (etapa === 2) return form.nomeMae.trim() || form.nomePai.trim() || form.responsavelLegal.nome.trim();
    if (etapa === 6) return pendencias.length === 0;
    return true;
  };

  const avancar = async () => {
    if (etapa < 6) {
      setEtapa((e) => e + 1);
      return;
    }
    await salvar();
  };

  const salvar = async () => {
    if (pendencias.length > 0) {
      toast.error(`Revise ${pendencias.length} pendência(s) antes de concluir.`);
      return;
    }

    setSalvando(true);
    try {
      const responsavelEmergencia = form.responsavelLegal.nome || form.nomeMae || form.nomePai;
      const telefoneEmergencia =
        form.responsavelLegal.celular ||
        form.mae.celular ||
        form.pai.celular ||
        form.responsavelLegal.telefoneResidencial ||
        form.mae.telefoneResidencial ||
        form.pai.telefoneResidencial;

      const payload = compactObject({
        unitId,
        firstName: cleanText(form.firstName),
        lastName: cleanText(form.lastName),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        cpf: onlyDigits(form.cpf) || undefined,
        rg: cleanText(form.rg),
        nacionalidade: cleanText(form.nacionalidade),
        naturalidade: cleanText(form.naturalidade),
        ufNascimento: cleanText(form.ufNascimento)?.toUpperCase(),
        raca: cleanText(form.raca),
        peso: cleanText(form.peso),
        bloodType: cleanText(form.bloodType),
        endereco: cleanText(form.endereco),
        cep: onlyDigits(form.cep) || undefined,
        nis: cleanText(form.nis),
        codigoAluno: cleanText(form.codigoAluno),
        inscricao: cleanText(form.inscricao),
        nomeMae: cleanText(form.nomeMae),
        nomePai: cleanText(form.nomePai),
        celPai: cleanText(form.pai.celular || form.mae.celular || form.responsavelLegal.celular),
        emergencyContactName: cleanText(responsavelEmergencia),
        emergencyContactPhone: cleanText(telefoneEmergencia),
        allergies: cleanText([form.allergies, form.intolerancias].filter(Boolean).join(' | ')),
        medicalConditions: cleanText(form.medicalConditions),
        medicationNeeds: cleanText(form.medicationNeeds),
        medicamentos: cleanText(form.medicamentos),
        laudado: form.laudado,
        tipoLaudo: cleanText(form.tipoLaudo),
        cid: cleanText(form.cid),
        descricaoLaudo: cleanText(form.descricaoLaudo),
        photoUrl: cleanText(form.photoUrl),
        usoImagem: form.usoImagem,
        dadosResponsaveis: compactObject({
          mae: compactObject({ ...form.mae, cpf: onlyDigits(form.mae.cpf), celular: onlyDigits(form.mae.celular), telefoneResidencial: onlyDigits(form.mae.telefoneResidencial) }),
          pai: compactObject({ ...form.pai, cpf: onlyDigits(form.pai.cpf), celular: onlyDigits(form.pai.celular), telefoneResidencial: onlyDigits(form.pai.telefoneResidencial) }),
          responsavelLegal: compactObject({
            ...form.responsavelLegal,
            cpf: onlyDigits(form.responsavelLegal.cpf),
            celular: onlyDigits(form.responsavelLegal.celular),
            telefoneResidencial: onlyDigits(form.responsavelLegal.telefoneResidencial),
          }),
        }),
        documentosMatricula: form.documentos,
        autorizadosRetirada: form.autorizados
          .filter((a) => a.nome.trim())
          .map((a) => compactObject({ ...a, telefone: onlyDigits(a.telefone) })),
        transporteEscolar: compactObject({
          utiliza: form.transporteEscolar,
          nomeTransporte: cleanText(form.nomeTransporte),
        }),
        fichaAdministrativa: compactObject({
          genitor: form.genitor,
          serieAnterior: cleanText(form.serieAnterior),
          observacoesSecretaria: cleanText(form.observacoesSecretaria),
          origemCampos: 'Planilha DADOS PARA PLATAFORMA PEDAGÓGICA',
        }),
      });

      let id: string;
      if (modoEdicao && childIdParam) {
        await http.put(`/children/${childIdParam}`, payload);
        if (form.classroomId || form.enrollmentId) {
          await http.put(`/children/${childIdParam}/enrollment/active`, {
            enrollmentId: form.enrollmentId || undefined,
            classroomId: form.classroomId || undefined,
            enrollmentDate: form.enrollmentDate || undefined,
          });
        }
        id = childIdParam;
        toast.success('Dados do aluno atualizados com sucesso.');
      } else {
        const res = await http.post('/children', payload);
        id = res.data?.id ?? res.data?.child?.id;
        if (!id) throw new Error('A API não retornou o ID da criança.');
        if (form.classroomId) {
          await http.post(`/children/${id}/enrollment`, {
            classroomId: form.classroomId,
            enrollmentDate: form.enrollmentDate,
          });
        }
        localStorage.removeItem(STORAGE_KEY);
        toast.success('Matrícula cadastrada com sucesso.');
      }
      navigate('/app/secretaria/matriculas');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  };

  const limparRascunho = () => {
    if (!confirm('Limpar todos os dados preenchidos neste rascunho?')) return;
    localStorage.removeItem(STORAGE_KEY);
    setForm(estadoInicial());
    setEtapa(1);
  };

  if (carregandoDados) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <PageShell
      title={modoEdicao ? `Editar Aluno` : 'Nova Matrícula'}
      description={modoEdicao ? `${form.firstName} ${form.lastName}`.trim() || 'Ficha administrativa' : 'Ficha administrativa completa da Secretaria'}
      headerActions={
        <button onClick={limparRascunho} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs text-red-600 hover:bg-red-50">
          <Trash2 className="h-3.5 w-3.5" />
          Limpar rascunho
        </button>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {ETAPAS.map((e, idx) => (
            <div key={e.id} className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => (modoEdicao || etapa > e.id) && setEtapa(e.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  etapa === e.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : (etapa > e.id || modoEdicao)
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {(etapa > e.id || modoEdicao) && etapa !== e.id ? <CheckCircle className="h-3.5 w-3.5" /> : e.icon}
                <span>{e.label}</span>
              </button>
              {idx < ETAPAS.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          {etapa === 1 && <EtapaCrianca form={form} atualizar={atualizar} modoEdicao={modoEdicao} enviandoFoto={enviandoFoto} onEnviarFoto={enviarFotoAluno} />}
          {etapa === 2 && (
            <EtapaResponsaveis
              form={form}
              atualizar={atualizar}
              atualizarResponsavel={atualizarResponsavel}
              atualizarAutorizado={atualizarAutorizado}
            />
          )}
          {etapa === 3 && <EtapaSaude form={form} atualizar={atualizar} />}
          {etapa === 4 && (
            <EtapaDocumentos
              form={form}
              atualizar={atualizar}
              atualizarDocumento={atualizarDocumento}
              empresasTransporte={empresasTransporte}
              onCadastrarEmpresaTransporte={cadastrarEmpresaTransporte}
              modoEdicao={modoEdicao}
              enviandoDocumento={enviandoDocumento}
              onEnviarDocumento={enviarDocumentoAluno}
            />
          )}
          {etapa === 5 && <EtapaTurma form={form} atualizar={atualizar} turmas={turmas} />}
          {etapa === 6 && <EtapaRevisao form={form} turmas={turmas} pendencias={pendencias} />}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={etapa === 1 ? () => navigate('/app/secretaria') : () => setEtapa((e) => e - 1)}
              className="flex items-center gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              {etapa === 1 ? 'Cancelar' : 'Voltar'}
            </Button>
            {modoEdicao && (
              <Button
                variant="outline"
                onClick={() => navigate('/app/secretaria/matriculas')}
                className="flex items-center gap-1.5 text-slate-600"
              >
                <Users className="h-4 w-4" />
                Lista de alunos
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {modoEdicao && etapa === 6 && childIdParam && (
              <Button
                variant="outline"
                onClick={() => navigate(`/app/secretaria/matriculas/${childIdParam}/ficha`)}
                className="flex items-center gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <FileText className="h-4 w-4" />
                Ver ficha / Imprimir
              </Button>
            )}
            <Button
              onClick={avancar}
              disabled={!podeAvancar() || salvando}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            >
              {salvando ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
              ) : etapa === 6 ? (
                <><ShieldCheck className="h-4 w-4" /> {modoEdicao ? 'Salvar alterações' : 'Confirmar Matrícula'}</>
              ) : (
                <>Próximo <ChevronRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function EtapaCrianca({ form, atualizar, modoEdicao, enviandoFoto, onEnviarFoto }: {
  form: FormularioMatricula;
  atualizar: <K extends keyof FormularioMatricula>(campo: K, valor: FormularioMatricula[K]) => void;
  modoEdicao: boolean;
  enviandoFoto: boolean;
  onEnviarFoto: (file?: File | null) => void;
}) {
  return (
    <div className="space-y-4">
      <TituloEtapa titulo="Dados da criança" subtitulo="Identificação conforme planilha oficial da unidade." />
      <div className="rounded-xl border border-slate-100 p-4 flex items-center gap-4">
        <ChildAvatar
          firstName={form.firstName}
          lastName={form.lastName}
          photoUrl={form.photoUrl}
          sizeClassName="w-20 h-20"
          imageClassName="rounded-2xl object-cover border border-slate-200"
          fallbackClassName="w-20 h-20 rounded-2xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center"
        />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">Foto do aluno</p>
          <p className="text-xs text-slate-500 mt-0.5">A foto fica vinculada à matrícula e aparece automaticamente na ficha/impressão.</p>
          {modoEdicao ? (
            <label className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
              {enviandoFoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              Enviar/alterar foto
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => onEnviarFoto(e.target.files?.[0])} disabled={enviandoFoto} />
            </label>
          ) : (
            <p className="text-xs text-amber-600 mt-2">Salve a matrícula primeiro para habilitar o upload da foto.</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Campo label="COD. ALUNO"><Input value={form.codigoAluno} onChange={(v) => atualizar('codigoAluno', v)} /></Campo>
        <Campo label="Inscrição"><Input value={form.inscricao} onChange={(v) => atualizar('inscricao', v)} /></Campo>
        <Campo label="CPF da criança"><Input value={form.cpf} onChange={(v) => atualizar('cpf', v)} placeholder="000.000.000-00" /></Campo>
        <Campo label="Nome *"><Input value={form.firstName} onChange={(v) => atualizar('firstName', v)} /></Campo>
        <Campo label="Sobrenome *"><Input value={form.lastName} onChange={(v) => atualizar('lastName', v)} /></Campo>
        <Campo label="Nascimento *"><Input type="date" value={form.dateOfBirth} onChange={(v) => atualizar('dateOfBirth', v)} /></Campo>
        <Campo label="Sexo">
          <select className={inputCls} value={form.gender} onChange={(e) => atualizar('gender', e.target.value as Genero)}>
            <option value="NAO_INFORMADO">Não informado</option>
            <option value="FEMININO">Feminino</option>
            <option value="MASCULINO">Masculino</option>
            <option value="OUTRO">Outro</option>
          </select>
        </Campo>
        <Campo label="Raça/Cor"><Input value={form.raca} onChange={(v) => atualizar('raca', v)} /></Campo>
        <Campo label="Peso"><Input value={form.peso} onChange={(v) => atualizar('peso', v)} placeholder="Ex.: 11kg" /></Campo>
        <Campo label="Nacionalidade"><Input value={form.nacionalidade} onChange={(v) => atualizar('nacionalidade', v)} /></Campo>
        <Campo label="Naturalidade"><Input value={form.naturalidade} onChange={(v) => atualizar('naturalidade', v)} /></Campo>
        <Campo label="UF"><Input value={form.ufNascimento} onChange={(v) => atualizar('ufNascimento', v.toUpperCase().slice(0, 2))} /></Campo>
        <Campo label="Endereço" className="sm:col-span-2"><Input value={form.endereco} onChange={(v) => atualizar('endereco', v)} /></Campo>
        <Campo label="CEP"><Input value={form.cep} onChange={(v) => atualizar('cep', v)} /></Campo>
        <Campo label="NIS"><Input value={form.nis} onChange={(v) => atualizar('nis', v)} /></Campo>
        <Campo label="Série anterior"><Input value={form.serieAnterior} onChange={(v) => atualizar('serieAnterior', v)} /></Campo>
        <Campo label="RG"><Input value={form.rg} onChange={(v) => atualizar('rg', v)} /></Campo>
      </div>
    </div>
  );
}

function EtapaResponsaveis({
  form, atualizar, atualizarResponsavel, atualizarAutorizado,
}: {
  form: FormularioMatricula;
  atualizar: <K extends keyof FormularioMatricula>(campo: K, valor: FormularioMatricula[K]) => void;
  atualizarResponsavel: (tipo: 'mae' | 'pai' | 'responsavelLegal', campo: keyof ResponsavelForm, valor: string) => void;
  atualizarAutorizado: (index: number, campo: keyof AutorizadoForm, valor: string) => void;
}) {
  return (
    <div className="space-y-5">
      <TituloEtapa titulo="Responsáveis e retirada da criança" subtitulo="Dados de mãe, pai, responsável legal e pessoas autorizadas." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ResponsavelBloco titulo="Mãe" tipo="mae" dados={form.mae} atualizar={atualizarResponsavel} nomePrincipal={form.nomeMae} setNomePrincipal={(v) => atualizar('nomeMae', v)} />
        <ResponsavelBloco titulo="Pai" tipo="pai" dados={form.pai} atualizar={atualizarResponsavel} nomePrincipal={form.nomePai} setNomePrincipal={(v) => atualizar('nomePai', v)} />
        <ResponsavelBloco titulo="Responsável legal" tipo="responsavelLegal" dados={form.responsavelLegal} atualizar={atualizarResponsavel} />
      </div>

      <div className="rounded-xl border border-slate-100 p-4">
        <p className="text-sm font-semibold text-slate-800 mb-3">Pessoas autorizadas para liberar a criança</p>
        <div className="space-y-3">
          {form.autorizados.map((a, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Campo label={`Nome autorizado ${idx + 1}`}><Input value={a.nome} onChange={(v) => atualizarAutorizado(idx, 'nome', v)} /></Campo>
              <Campo label="Parentesco"><Input value={a.parentesco} onChange={(v) => atualizarAutorizado(idx, 'parentesco', v)} /></Campo>
              <Campo label="Telefone"><Input value={a.telefone} onChange={(v) => atualizarAutorizado(idx, 'telefone', v)} /></Campo>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResponsavelBloco({
  titulo, tipo, dados, atualizar, nomePrincipal, setNomePrincipal,
}: {
  titulo: string;
  tipo: 'mae' | 'pai' | 'responsavelLegal';
  dados: ResponsavelForm;
  atualizar: (tipo: 'mae' | 'pai' | 'responsavelLegal', campo: keyof ResponsavelForm, valor: string) => void;
  nomePrincipal?: string;
  setNomePrincipal?: (valor: string) => void;
}) {
  const set = (campo: keyof ResponsavelForm) => (valor: string) => atualizar(tipo, campo, valor);
  return (
    <div className="rounded-xl border border-slate-100 p-4 space-y-3">
      <p className="text-sm font-semibold text-slate-800">{titulo}</p>
      <Campo label="Nome"><Input value={nomePrincipal ?? dados.nome} onChange={(v) => { set('nome')(v); setNomePrincipal?.(v); }} /></Campo>
      <Campo label="CPF"><Input value={dados.cpf} onChange={set('cpf')} /></Campo>
      <Campo label="Celular"><Input value={dados.celular} onChange={set('celular')} /></Campo>
      <Campo label="Telefone residencial"><Input value={dados.telefoneResidencial} onChange={set('telefoneResidencial')} /></Campo>
      <Campo label="E-mail"><Input value={dados.email} onChange={set('email')} /></Campo>
      <Campo label="Endereço"><Input value={dados.endereco} onChange={set('endereco')} /></Campo>
      <Campo label="CEP"><Input value={dados.cep} onChange={set('cep')} /></Campo>
      <Campo label="Identidade"><Input value={dados.identidade} onChange={set('identidade')} /></Campo>
      <Campo label="Órgão expedidor"><Input value={dados.orgaoExpeditor} onChange={set('orgaoExpeditor')} /></Campo>
      <Campo label="Escolaridade"><Input value={dados.escolaridade} onChange={set('escolaridade')} /></Campo>
      <Campo label="Profissão"><Input value={dados.profissao} onChange={set('profissao')} /></Campo>
      <Campo label="Benefício"><Input value={dados.beneficio} onChange={set('beneficio')} /></Campo>
      <Campo label="Nº pessoas em casa"><Input value={dados.pessoasCasa} onChange={set('pessoasCasa')} /></Campo>
    </div>
  );
}

function EtapaSaude({ form, atualizar }: { form: FormularioMatricula; atualizar: <K extends keyof FormularioMatricula>(campo: K, valor: FormularioMatricula[K]) => void }) {
  return (
    <div className="space-y-4">
      <TituloEtapa titulo="Saúde, laudos, intolerâncias e medicamentos" subtitulo="Informações críticas para secretaria, nutrição, professores e contato com responsáveis." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Campo label="Tipagem sanguínea">
          <select className={inputCls} value={form.bloodType} onChange={(e) => atualizar('bloodType', e.target.value)}>
            <option value="">Não informado</option>
            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Campo>
        <Campo label="Intolerantes"><Input value={form.intolerancias} onChange={(v) => atualizar('intolerancias', v)} placeholder="Ex.: lactose, glúten" /></Campo>
        <Campo label="Alergias"><Input value={form.allergies} onChange={(v) => atualizar('allergies', v)} /></Campo>
        <Campo label="Condições médicas"><Input value={form.medicalConditions} onChange={(v) => atualizar('medicalConditions', v)} /></Campo>
        <Campo label="Necessidades de medicação"><Input value={form.medicationNeeds} onChange={(v) => atualizar('medicationNeeds', v)} /></Campo>
        <Campo label="Medicamentos"><Input value={form.medicamentos} onChange={(v) => atualizar('medicamentos', v)} /></Campo>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Check label="Laudado" checked={form.laudado} onChange={(v) => atualizar('laudado', v)} />
        <Check label="Genitor informado" checked={form.genitor} onChange={(v) => atualizar('genitor', v)} />
        <Check label="Uso de imagem autorizado" checked={form.usoImagem} onChange={(v) => atualizar('usoImagem', v)} />
      </div>
      {form.laudado && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/60">
          <Campo label="Tipo de laudo *"><Input value={form.tipoLaudo} onChange={(v) => atualizar('tipoLaudo', v)} /></Campo>
          <Campo label="CID"><Input value={form.cid} onChange={(v) => atualizar('cid', v)} /></Campo>
          <Campo label="Descrição do laudo" className="sm:col-span-3">
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.descricaoLaudo} onChange={(e) => atualizar('descricaoLaudo', e.target.value)} />
          </Campo>
        </div>
      )}
    </div>
  );
}

function EtapaDocumentos({ form, atualizar, atualizarDocumento, empresasTransporte, onCadastrarEmpresaTransporte, modoEdicao, enviandoDocumento, onEnviarDocumento }: {
  form: FormularioMatricula;
  atualizar: <K extends keyof FormularioMatricula>(campo: K, valor: FormularioMatricula[K]) => void;
  atualizarDocumento: (campo: keyof Omit<DocumentosMatricula, 'anexos'>, valor: boolean) => void;
  empresasTransporte: EmpresaTransporte[];
  onCadastrarEmpresaTransporte: () => void;
  modoEdicao: boolean;
  enviandoDocumento: string | null;
  onEnviarDocumento: (tipo: keyof Omit<DocumentosMatricula, 'anexos'>, file?: File | null) => void;
}) {
  return (
    <div className="space-y-4">
      <TituloEtapa titulo="Documentos, transporte e autorizações" subtitulo="Checklist administrativo da ficha da criança." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {DOCUMENTOS_CHECKLIST.map(({ key, label }) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
            <Check label={label} checked={Boolean(form.documentos[key])} onChange={(v) => atualizarDocumento(key, v)} />
            <div className="flex items-center justify-between gap-2 pl-1">
              <span className="text-[11px] text-slate-400">{form.documentos.anexos?.[key]?.length ? `${form.documentos.anexos[key].length} arquivo(s)` : 'Sem arquivo anexado'}</span>
              {modoEdicao && (
                <label className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 text-[11px] text-slate-600 hover:bg-slate-50 cursor-pointer">
                  {enviandoDocumento === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Anexar
                  <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx" onChange={(e) => onEnviarDocumento(key, e.target.files?.[0])} disabled={enviandoDocumento === key} />
                </label>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Check label="Utiliza transporte escolar" checked={form.transporteEscolar} onChange={(v) => atualizar('transporteEscolar', v)} />
        <Campo label="Empresa de transporte">
          <div className="flex gap-2">
            <select className={inputCls} value={form.nomeTransporte} onChange={(e) => atualizar('nomeTransporte', e.target.value)} disabled={!form.transporteEscolar}>
              <option value="">Selecione ou cadastre</option>
              {empresasTransporte.map((empresa) => <option key={empresa.id} value={empresa.nome}>{empresa.nome}</option>)}
              {form.nomeTransporte && !empresasTransporte.some((empresa) => empresa.nome === form.nomeTransporte) && (
                <option value={form.nomeTransporte}>{form.nomeTransporte}</option>
              )}
            </select>
            <button
              type="button"
              onClick={onCadastrarEmpresaTransporte}
              disabled={!form.transporteEscolar || !form.nomeTransporte.trim()}
              className="px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cadastrar
            </button>
          </div>
          <Input value={form.nomeTransporte} onChange={(v) => atualizar('nomeTransporte', v)} placeholder="Digite para cadastrar nova empresa" disabled={!form.transporteEscolar} />
        </Campo>
      </div>

      <Campo label="Observações da Secretaria">
        <textarea className={`${inputCls} resize-none`} rows={4} value={form.observacoesSecretaria} onChange={(e) => atualizar('observacoesSecretaria', e.target.value)} />
      </Campo>
    </div>
  );
}

function EtapaTurma({ form, atualizar, turmas }: {
  form: FormularioMatricula;
  atualizar: <K extends keyof FormularioMatricula>(campo: K, valor: FormularioMatricula[K]) => void;
  turmas: Turma[];
}) {
  return (
    <div className="space-y-4">
      <TituloEtapa titulo="Turma e data de matrícula" subtitulo="A criança pode ser cadastrada sem turma e regularizada depois pela Secretaria." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Campo label="Turma">
          <select className={inputCls} value={form.classroomId} onChange={(e) => atualizar('classroomId', e.target.value)}>
            <option value="">Sem turma neste momento</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Campo>
        <Campo label="Data de matrícula *"><Input type="date" value={form.enrollmentDate} onChange={(v) => atualizar('enrollmentDate', v)} /></Campo>
      </div>
    </div>
  );
}

function EtapaRevisao({ form, turmas, pendencias }: { form: FormularioMatricula; turmas: Turma[]; pendencias: string[] }) {
  const turma = turmas.find((t) => t.id === form.classroomId)?.name ?? 'Sem turma definida';
  return (
    <div className="space-y-4">
      <TituloEtapa titulo="Revisão final" subtitulo="Confirme antes de gravar no cadastro da criança." />
      {pendencias.length > 0 && (
        <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          <div className="flex items-center gap-2 font-medium mb-1">
            <AlertTriangle className="h-4 w-4" />
            Pendências obrigatórias
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            {pendencias.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}
      <Resumo titulo="Criança" linhas={[
        ['Nome', `${form.firstName} ${form.lastName}`],
        ['Nascimento', form.dateOfBirth],
        ['CPF', form.cpf],
        ['Código/Inscrição', [form.codigoAluno, form.inscricao].filter(Boolean).join(' / ')],
        ['Endereço', [form.endereco, form.cep].filter(Boolean).join(' · ')],
      ]} />
      <Resumo titulo="Responsáveis" linhas={[
        ['Mãe', form.nomeMae],
        ['Pai', form.nomePai],
        ['Resp. legal', form.responsavelLegal.nome],
        ['Telefone', form.responsavelLegal.celular || form.mae.celular || form.pai.celular],
      ]} />
      <Resumo titulo="Saúde e documentos" linhas={[
        ['Alergias/intolerâncias', [form.allergies, form.intolerancias].filter(Boolean).join(' | ')],
        ['Laudo', form.laudado ? `${form.tipoLaudo || 'Sim'} ${form.cid || ''}` : 'Não'],
        ['Uso de imagem', form.usoImagem ? 'Autorizado' : 'Não autorizado'],
        ['Transporte', form.transporteEscolar ? form.nomeTransporte || 'Sim' : 'Não'],
      ]} />
      <Resumo titulo="Matrícula" linhas={[
        ['Turma', turma],
        ['Data', form.enrollmentDate],
      ]} />
    </div>
  );
}

function TituloEtapa({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-800">{titulo}</h2>
      <p className="text-xs text-slate-400 mt-0.5">{subtitulo}</p>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors';

function Campo({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={className}>
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = 'text', disabled = false }: { value: string; onChange: (value: string) => void; placeholder?: string; type?: string; disabled?: boolean }) {
  return <input type={type} className={inputCls} value={value} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <span>{label}</span>
    </label>
  );
}

function Resumo({ titulo, linhas }: { titulo: string; linhas: Array<[string, string]> }) {
  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-600">{titulo}</p>
      </div>
      <div className="divide-y divide-slate-50">
        {linhas.filter(([, value]) => value).map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 px-4 py-2">
            <span className="text-xs text-slate-400">{label}</span>
            <span className="text-xs text-slate-700 text-right font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
