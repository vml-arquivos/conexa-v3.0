/**
 * MobileFichaAlunoPage — Ficha operacional do aluno no PWA.
 *
 * A tela usa os endpoints de consulta já autorizados ao professor
 * (GET /children/:id e GET /children/:id/dietary-restrictions), sem solicitar
 * a ficha administrativa completa, que é exclusiva da Secretaria e da gestão.
 *
 * Funciona online e cai para o cache local quando offline (dados básicos).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent, ComponentType, ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Camera, Loader2, Phone, AlertTriangle, FileText,
  HeartPulse, GraduationCap, Users, ShieldCheck, Pill,
} from 'lucide-react';
import http from '../../api/http';
import { childrenCache } from '../../services/offlineDB';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import {
  resolveChildPhotoUrl, getChildDisplayName, getChildInitials,
} from '../../components/children/ChildAvatar';

// ─── Tipos do contrato resumido para o professor ─────────────────────────────
interface RestricaoAlimentar {
  id: string;
  name?: string | null;
  severity?: string | null;
  description?: string | null;
  forbiddenFoods?: string | null;
  isActive?: boolean;
}

interface Ficha {
  id: string;
  firstName: string;
  lastName: string;
  dataNascimento?: string | null;
  genero?: string | null;
  foto?: string | null;
  photoUrl?: string | null;
  bloodType?: string | null;
  raca?: string | null;
  alergias?: string | null;
  condicoesMedicas?: string | null;
  necessidadeMedicacao?: string | null;
  laudado?: boolean;
  tipoLaudo?: string | null;
  descricaoLaudo?: string | null;
  nomeMae?: string | null;
  nomePai?: string | null;
  celPai?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  turma?: { id: string; name: string } | null;
  unidade?: { id: string; name: string; code?: string } | null;
  restricoesAlimentares?: RestricaoAlimentar[];
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
        const [childRes, restricoesRes] = await Promise.all([
          http.get(`/children/${childId}`),
          http.get(`/children/${childId}/dietary-restrictions`),
        ]);
        const child = childRes.data;
        const restricoes = Array.isArray(restricoesRes.data)
          ? restricoesRes.data.filter((r: RestricaoAlimentar) => r?.isActive !== false)
          : [];

        setFicha({
          id: child.id,
          firstName: child.firstName,
          lastName: child.lastName,
          dataNascimento: child.dateOfBirth,
          genero: child.gender,
          foto: child.photoUrl,
          photoUrl: child.photoUrl,
          bloodType: child.bloodType,
          raca: child.raca,
          alergias: child.allergies,
          condicoesMedicas: child.medicalConditions,
          necessidadeMedicacao: child.medicationNeeds,
          laudado: child.laudado,
          tipoLaudo: child.tipoLaudo,
          descricaoLaudo: child.descricaoLaudo,
          nomeMae: child.nomeMae,
          nomePai: child.nomePai,
          celPai: child.celPai,
          emergencyContactName: child.emergencyContactName,
          emergencyContactPhone: child.emergencyContactPhone,
          turma: child.enrollments?.[0]?.classroom ?? null,
          unidade: child.unit ?? null,
          restricoesAlimentares: restricoes,
        });
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
            {ficha.restricoesAlimentares?.map((restricao) => (
              <Alerta key={restricao.id} cor="#b45309" bg="#fffbeb">
                <AlertTriangle size={15} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong>Restrição alimentar:</strong>{' '}
                  {restricao.name || 'Não especificada'}
                  {restricao.severity ? ` (${restricao.severity})` : ''}
                  {restricao.description ? ` — ${restricao.description}` : ''}
                  {restricao.forbiddenFoods ? ` Alimentos proibidos: ${restricao.forbiddenFoods}` : ''}
                </div>
              </Alerta>
            ))}
            <Campo label="Condições médicas" valor={ficha.condicoesMedicas} />
            <Campo label="Necessidade de medicação" valor={ficha.necessidadeMedicacao} icon={<Pill size={13} color="#94a3b8" />} />
            <Campo label="Possui laudo" valor={ficha.laudado ? 'Sim' : 'Não'} />
            <Campo label="Tipo de laudo" valor={ficha.tipoLaudo} />
            <Campo label="Descrição do laudo" valor={ficha.descricaoLaudo} />
          </Secao>

          {/* ── Matrícula / Turma ───────────────────────────────────── */}
          <Secao titulo="Matrícula" Icon={GraduationCap} cor="#0284c7">
            <Campo label="Turma" valor={ficha.turma?.name} />
            <Campo label="Unidade" valor={ficha.unidade?.name} />
            <Campo label="Matrícula (ID)" valor={ficha.id} mono />
          </Secao>

          {/* ── Contatos operacionais ───────────────────────────────── */}
          <Secao titulo="Contatos operacionais" Icon={Users} cor="#7c3aed">
            {!ficha.nomeMae && !ficha.nomePai && !ficha.emergencyContactName
              && !ficha.emergencyContactPhone && !ficha.celPai && (
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0' }}>Nenhum contato cadastrado.</p>
            )}
            <Campo label="Nome da mãe" valor={ficha.nomeMae} />
            <Campo label="Nome do pai" valor={ficha.nomePai} />
            <Campo label="Contato de emergência" valor={ficha.emergencyContactName} />
            {ficha.emergencyContactPhone && <TelLink tel={ficha.emergencyContactPhone} />}
            {!ficha.emergencyContactPhone && ficha.celPai && <TelLink tel={ficha.celPai} />}
          </Secao>

          {/* ── Identificação ───────────────────────────────────────── */}
          <Secao titulo="Identificação" Icon={FileText} cor="#64748b">
            <Campo label="Data de nascimento" valor={fmtData(ficha.dataNascimento)} />
            <Campo label="Gênero" valor={ficha.genero} />
            <Campo label="Tipagem sanguínea" valor={ficha.bloodType} />
            <Campo label="Raça/Cor" valor={ficha.raca} />
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
