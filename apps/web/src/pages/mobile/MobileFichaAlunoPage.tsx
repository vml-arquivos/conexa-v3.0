/**
 * MobileFichaAlunoPage — Ficha completa do aluno no PWA
 *
 * Objetivo (pedido do Marcio):
 * - Consultar dados do aluno de forma fácil e organizada no mobile.
 * - Mesma fonte de dados do painel web dos professores (GET /children/:id/ficha-completa).
 * - Avatar com foto + botão de CÂMERA para tirar/trocar a foto do aluno
 *   (usa o endpoint já existente POST /children/:id/photo).
 * - Saúde (alergias, laudo, condições, medicação), matrícula/turma,
 *   responsáveis (mãe/pai/legal) com telefones clicáveis, autorizados e dados pessoais.
 *
 * Funciona online (ficha completa) e cai para o cache local quando offline (dados básicos).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent, ComponentType, ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Camera, Loader2, Phone, AlertTriangle, FileText,
  HeartPulse, GraduationCap, Users, MapPin, ShieldCheck, Pill,
} from 'lucide-react';
import http from '../../api/http';
import { childrenCache } from '../../services/offlineDB';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import {
  resolveChildPhotoUrl, getChildDisplayName, getChildInitials,
} from '../../components/children/ChildAvatar';

// ─── Tipos (espelham GET /children/:id/ficha-completa) ─────────────────────────
interface Responsavel {
  nome?: string; parentesco?: string; cpf?: string; celular?: string;
  telefoneResidencial?: string; telefoneTrabalho?: string; email?: string;
  profissao?: string;
}
interface Autorizado {
  nome?: string; parentesco?: string; telefone?: string; documento?: string;
}
interface Ficha {
  id: string;
  firstName: string;
  lastName: string;
  dataNascimento?: string | null;
  genero?: string | null;
  foto?: string | null;
  photoUrl?: string | null;
  nacionalidade?: string | null;
  naturalidade?: string | null;
  uf_nascimento?: string | null;
  endereco?: string | null;
  cep?: string | null;
  alergias?: string | null;
  condicoesMedicas?: string | null;
  necessidadeMedicacao?: string | null;
  laudado?: boolean;
  dadosResponsaveis?: { mae?: Responsavel; pai?: Responsavel; responsavelLegal?: Responsavel } | null;
  autorizadosRetirada?: Autorizado[] | null;
  turma?: { id: string; name: string } | null;
  unidade?: { id: string; name: string; code?: string } | null;
}

const ACCENT = '#4f46e5';

function fmtData(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '—'; }
}

function idadeAnos(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hoje = new Date();
  let anos = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) anos--;
  return anos >= 0 ? `${anos} ano${anos !== 1 ? 's' : ''}` : '';
}

function soDigitos(tel?: string): string {
  return (tel ?? '').replace(/\D/g, '');
}

export default function MobileFichaAlunoPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const { isOnline } = useOfflineSync();

  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [fotoErro, setFotoErro] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const carregar = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    setErro(null);
    try {
      if (isOnline) {
        const res = await http.get(`/children/${childId}/ficha-completa`);
        setFicha(res.data);
      } else {
        // Offline: dados básicos do cache local
        const todos = await childrenCache.getAll();
        const c = todos.find((x) => x.id === childId);
        if (c) {
          setFicha({
            id: c.id, firstName: c.firstName, lastName: c.lastName,
            photoUrl: c.photoUrl, alergias: c.allergies, laudado: c.laudado,
          });
        } else {
          setErro('Sem conexão e ficha não está salva offline.');
        }
      }
    } catch {
      setErro('Não foi possível carregar a ficha do aluno.');
    } finally {
      setLoading(false);
    }
  }, [childId, isOnline]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirCamera = () => {
    if (!isOnline) {
      setFotoErro('Conecte-se à internet para enviar a foto.');
      return;
    }
    setFotoErro(null);
    fileInputRef.current?.click();
  };

  const onFotoSelecionada = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reescolher o mesmo arquivo
    if (!file || !childId) return;

    if (file.size > 5 * 1024 * 1024) {
      setFotoErro('Imagem muito grande (máx. 5 MB).');
      return;
    }

    setEnviandoFoto(true);
    setFotoErro(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await http.post(`/children/${childId}/photo`, fd);
      const novaUrl = res.data?.photoUrl ?? res.data?.foto ?? null;
      setFicha((prev) => prev ? { ...prev, foto: novaUrl, photoUrl: novaUrl } : prev);
    } catch {
      setFotoErro('Falha ao enviar a foto. Tente novamente.');
    } finally {
      setEnviandoFoto(false);
    }
  };

  const fotoUrl = resolveChildPhotoUrl(ficha ?? undefined);
  const nome = ficha ? getChildDisplayName(ficha) : '';
  const iniciais = ficha ? getChildInitials(ficha) : 'CR';

  return (
    <div style={{ padding: '12px 16px 100px' }}>
      {/* Voltar */}
      <button
        onClick={() => navigate('/app/mobile/alunos')}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#64748b', fontSize: 14, padding: '4px 0',
        }}
      >
        <ChevronLeft size={18} /> Alunos
      </button>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#94a3b8' }} />
        </div>
      )}

      {erro && !loading && (
        <div style={{ padding: '12px 14px', background: '#fef2f2', borderRadius: 12, fontSize: 14, color: '#991b1b' }}>
          {erro}
        </div>
      )}

      {ficha && !loading && (
        <>
          {/* ── Cabeçalho com avatar + câmera ───────────────────────── */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: '#fff', borderRadius: 18, padding: '20px 16px',
            border: '0.5px solid #e2e8f0', marginBottom: 14,
          }}>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              {fotoUrl ? (
                <img
                  src={fotoUrl}
                  alt={nome}
                  style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid #eef2ff' }}
                />
              ) : (
                <div style={{
                  width: 96, height: 96, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#e0e7ff,#ede9fe)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 30, fontWeight: 600, color: ACCENT,
                }}>
                  {iniciais}
                </div>
              )}

              {/* Botão câmera */}
              <button
                onClick={abrirCamera}
                disabled={enviandoFoto}
                title="Tirar / trocar foto"
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 34, height: 34, borderRadius: '50%',
                  background: ACCENT, border: '3px solid #fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
              >
                {enviandoFoto
                  ? <Loader2 size={15} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                  : <Camera size={15} color="#fff" />}
              </button>

              {/* input de câmera (mobile abre a câmera traseira) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onFotoSelecionada}
                style={{ display: 'none' }}
              />
            </div>

            <h1 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: '#0f172a', textAlign: 'center', lineHeight: 1.25 }}>
              {nome}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8 }}>
              {ficha.turma?.name && <Chip>{ficha.turma.name}</Chip>}
              {ficha.dataNascimento && <Chip>{idadeAnos(ficha.dataNascimento)}</Chip>}
              {ficha.laudado && <Chip tone="warn"><ShieldCheck size={11} /> Laudado</Chip>}
            </div>

            {fotoErro && (
              <p style={{ marginTop: 10, fontSize: 12, color: '#dc2626', textAlign: 'center' }}>{fotoErro}</p>
            )}
            {!isOnline && (
              <p style={{ marginTop: 8, fontSize: 11, color: '#92400e', textAlign: 'center' }}>
                Offline — exibindo dados básicos salvos.
              </p>
            )}
          </div>

          {/* ── Saúde ───────────────────────────────────────────────── */}
          <Secao titulo="Saúde" Icon={HeartPulse} cor="#dc2626">
            {ficha.alergias ? (
              <Alerta cor="#dc2626" bg="#fef2f2">
                <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                <div><strong>Alergias:</strong> {ficha.alergias}</div>
              </Alerta>
            ) : (
              <Campo label="Alergias" valor="Nenhuma registrada" />
            )}
            <Campo label="Condições médicas" valor={ficha.condicoesMedicas} />
            <Campo label="Necessidade de medicação" valor={ficha.necessidadeMedicacao} icon={<Pill size={13} color="#94a3b8" />} />
            <Campo label="Possui laudo" valor={ficha.laudado ? 'Sim' : 'Não'} />
          </Secao>

          {/* ── Matrícula / Turma ───────────────────────────────────── */}
          <Secao titulo="Matrícula" Icon={GraduationCap} cor="#0284c7">
            <Campo label="Turma" valor={ficha.turma?.name} />
            <Campo label="Unidade" valor={ficha.unidade?.name} />
            <Campo label="Matrícula (ID)" valor={ficha.id} mono />
          </Secao>

          {/* ── Responsáveis ────────────────────────────────────────── */}
          <Secao titulo="Responsáveis" Icon={Users} cor="#7c3aed">
            {!ficha.dadosResponsaveis?.mae?.nome
              && !ficha.dadosResponsaveis?.pai?.nome
              && !ficha.dadosResponsaveis?.responsavelLegal?.nome && (
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0' }}>Nenhum responsável cadastrado.</p>
            )}
            {ficha.dadosResponsaveis?.mae?.nome && (
              <CardResponsavel rotulo="Mãe" resp={ficha.dadosResponsaveis.mae} />
            )}
            {ficha.dadosResponsaveis?.pai?.nome && (
              <CardResponsavel rotulo="Pai" resp={ficha.dadosResponsaveis.pai} />
            )}
            {ficha.dadosResponsaveis?.responsavelLegal?.nome && (
              <CardResponsavel rotulo="Responsável legal" resp={ficha.dadosResponsaveis.responsavelLegal} />
            )}
          </Secao>

          {/* ── Autorizados a retirar ───────────────────────────────── */}
          {Array.isArray(ficha.autorizadosRetirada) && ficha.autorizadosRetirada.filter(a => a?.nome?.trim()).length > 0 && (
            <Secao titulo="Autorizados a retirar" Icon={ShieldCheck} cor="#059669">
              {ficha.autorizadosRetirada.filter(a => a?.nome?.trim()).map((a, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#0f172a' }}>
                    {a.nome} {a.parentesco ? <span style={{ color: '#94a3b8', fontWeight: 400 }}>· {a.parentesco}</span> : null}
                  </p>
                  {a.telefone && <TelLink tel={a.telefone} />}
                </div>
              ))}
            </Secao>
          )}

          {/* ── Dados pessoais ──────────────────────────────────────── */}
          <Secao titulo="Dados pessoais" Icon={FileText} cor="#64748b">
            <Campo label="Data de nascimento" valor={fmtData(ficha.dataNascimento)} />
            <Campo label="Gênero" valor={ficha.genero} />
            <Campo label="Naturalidade" valor={[ficha.naturalidade, ficha.uf_nascimento].filter(Boolean).join(' / ')} />
            <Campo label="Nacionalidade" valor={ficha.nacionalidade} />
            <Campo label="Endereço" valor={[ficha.endereco, ficha.cep].filter(Boolean).join(' · ')} icon={<MapPin size={13} color="#94a3b8" />} />
          </Secao>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Componentes auxiliares ────────────────────────────────────────────────────

function Chip({ children, tone }: { children: ReactNode; tone?: 'warn' }) {
  const warn = tone === 'warn';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 20,
      background: warn ? '#fffbeb' : '#eef2ff',
      color: warn ? '#92400e' : '#4338ca',
      border: `0.5px solid ${warn ? '#fde68a' : '#e0e7ff'}`,
    }}>
      {children}
    </span>
  );
}

function Secao({ titulo, Icon, cor, children }: {
  titulo: string; Icon: ComponentType<{ size?: number; color?: string }>; cor: string; children: ReactNode;
}) {
  return (
    <section style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '0.5px solid #e2e8f0', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 9, background: `${cor}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={cor} />
        </div>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#0f172a' }}>{titulo}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Campo({ label, valor, mono, icon }: { label: string; valor?: string | null; mono?: boolean; icon?: ReactNode }) {
  const v = (valor ?? '').toString().trim();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '0.5px solid #f1f5f9' }}>
      <span style={{ fontSize: 13, color: '#94a3b8', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 13, color: v ? '#0f172a' : '#cbd5e1', fontWeight: 500, textAlign: 'right',
        fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-word',
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
        {icon}{v || '—'}
      </span>
    </div>
  );
}

function Alerta({ children, cor, bg }: { children: ReactNode; cor: string; bg: string }) {
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-start',
      background: bg, border: `0.5px solid ${cor}33`, borderRadius: 10,
      padding: '9px 11px', fontSize: 13, color: cor, marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function TelLink({ tel }: { tel: string }) {
  const digits = soDigitos(tel);
  if (!digits) return null;
  return (
    <a href={`tel:${digits}`} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4,
      fontSize: 13, color: ACCENT, textDecoration: 'none', fontWeight: 500,
    }}>
      <Phone size={13} /> {tel}
    </a>
  );
}

function CardResponsavel({ rotulo, resp }: { rotulo: string; resp: Responsavel }) {
  const tels = [resp.celular, resp.telefoneResidencial, resp.telefoneTrabalho].filter(Boolean) as string[];
  return (
    <div style={{ padding: '8px 0', borderBottom: '0.5px solid #f1f5f9' }}>
      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 0.4 }}>{rotulo}</p>
      <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#0f172a' }}>{resp.nome}</p>
      {resp.parentesco && <p style={{ fontSize: 12, color: '#64748b', margin: '1px 0 0' }}>{resp.parentesco}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
        {tels.map((t, i) => <TelLink key={i} tel={t} />)}
      </div>
      {resp.email && <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0', wordBreak: 'break-all' }}>{resp.email}</p>}
    </div>
  );
}
