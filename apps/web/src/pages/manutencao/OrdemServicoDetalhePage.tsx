import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CalendarClock, Loader2, MapPin, Paperclip, UserRound } from 'lucide-react';
import { PageShell } from '../../components/ui/PageShell';
import { Button } from '../../components/ui/button';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonGrid } from '../../components/ui/ds';
import { useAuth } from '../../app/AuthProvider';
import { normalizeRoles } from '../../app/RoleProtectedRoute';
import {
  acceptServiceOrder, attachmentUrl, cancelServiceOrder, commentServiceOrder, completeServiceOrder,
  evaluateServiceOrder, getMaintenanceTeam, getServiceOrder, startServiceOrder, updateServiceOrder,
  uploadServiceOrderFile, type ServiceOrder, type ServiceOrderResult,
} from '../../api/service-orders';
import { StatusPill } from './OsBits';
import {
  CATEGORY_LABEL, EVENT_LABEL, PRIORITY_LABEL, PRIORITY_STYLE, RESULT_LABEL, fmtDate, toDateInput,
} from './osMeta';

const errMsg = (e: unknown, fallback: string) => {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(m) ? m.join(' · ') : m || fallback;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-ds-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-ds-xs sm:p-5">
      <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function OrdemServicoDetalhePage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const photoErrors = (location.state as { photoErrors?: number } | null)?.photoErrors;
  const { user } = useAuth();
  const levels = normalizeRoles(user);
  const isAdmin = levels.some((l) => l === 'DEVELOPER');
  const isMant = levels.includes('MANTENEDORA');
  const isManut = levels.includes('MANUTENCAO');

  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [team, setTeam] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // campos dos formulários de ação
  const [due, setDue] = useState(toDateInput(new Date(Date.now() + 3 * 864e5)));
  const [assignee, setAssignee] = useState('');
  const [report, setReport] = useState('');
  const [result, setResult] = useState<ServiceOrderResult>('EXECUTADO');
  const [evalResult, setEvalResult] = useState<ServiceOrderResult>('EXECUTADO');
  const [evalNotes, setEvalNotes] = useState('');
  const [reopen, setReopen] = useState(true);
  const [comment, setComment] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  const load = useCallback(async () => {
    try {
      const o = await getServiceOrder(id);
      setOrder(o);
      setError(null);
    } catch (e) {
      setError(errMsg(e, 'Ordem não encontrada ou sem permissão.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (isManut || isMant || isAdmin) getMaintenanceTeam().then(setTeam).catch(() => setTeam([]));
  }, [isManut, isMant, isAdmin]);

  const run = async (fn: () => Promise<unknown>, okReset?: () => void) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      okReset?.();
      await load();
    } catch (e) {
      setActionError(errMsg(e, 'Não foi possível concluir a ação.'));
    } finally {
      setBusy(false);
    }
  };

  const onPhoto = (file?: File | null) => {
    if (!file) return;
    void run(() => uploadServiceOrderFile(id, file));
  };

  if (loading) return <PageShell title="Ordem de serviço"><SkeletonGrid n={2} cols={1} /></PageShell>;
  if (error || !order) {
    return <PageShell title="Ordem de serviço"><ErrorState message={error ?? 'Ordem não encontrada.'} onRetry={() => void load()} /></PageShell>;
  }

  const mine = !!user && order.assignedToId === (user as { id?: string }).id;
  const active = ['ABERTA', 'ACEITA', 'EM_EXECUCAO', 'AGUARDANDO_AVALIACAO'].includes(order.status);
  const canExecute = isAdmin || (isManut && (order.status === 'ABERTA' || mine));
  const canManage = (isManut || isMant || isAdmin) && active;
  const canEvaluate = !isManut || isAdmin || isMant;
  const backTo = isManut && !isAdmin && !isMant ? '/app/manutencao' : '/app/ordens-servico';
  const photos = order.attachments ?? [];

  return (
    <PageShell
      title={`OS #${order.number}`}
      subtitle={order.title}
      headerActions={<Button asChild variant="outline" size="sm"><Link to={backTo}>Voltar</Link></Button>}
    >
      <div className="space-y-5">
      {photoErrors ? (
        <div role="alert" className="ds-alert ds-alert-warning">
          A ordem foi criada, mas {photoErrors} foto(s) não foram enviadas. Você pode anexar novamente abaixo.
        </div>
      ) : null}
      {actionError && <div role="alert" className="ds-alert ds-alert-error">{actionError}</div>}

      <Section title="Resumo">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={order.status} />
          <span className={`text-sm font-semibold ${PRIORITY_STYLE[order.priority]}`}>Prioridade {PRIORITY_LABEL[order.priority].toLowerCase()}</span>
          <span className="ds-badge ds-badge-neutral">{CATEGORY_LABEL[order.category]}</span>
          {order.reopenCount > 0 && <span className="ds-badge ds-badge-amber">Refeita {order.reopenCount}x</span>}
        </div>
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--text-primary)]">{order.description}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-[var(--text-tertiary)]" /><div><dt className="text-xs text-[var(--text-tertiary)]">Onde</dt><dd>{order.unit?.name} — {order.location}</dd></div></div>
          <div className="flex items-start gap-2"><UserRound className="mt-0.5 h-4 w-4 text-[var(--text-tertiary)]" /><div><dt className="text-xs text-[var(--text-tertiary)]">Pedido por</dt><dd>{order.requestedByName ?? '—'} · {fmtDate(order.createdAt, true)}</dd></div></div>
          <div className="flex items-start gap-2"><CalendarClock className="mt-0.5 h-4 w-4 text-[var(--text-tertiary)]" /><div><dt className="text-xs text-[var(--text-tertiary)]">Prazo</dt><dd className={order.isOverdue ? 'font-semibold text-[var(--error)]' : ''}>{order.dueDate ? `${fmtDate(order.dueDate)}${order.isOverdue ? ' (atrasada)' : ''}` : 'A definir pela manutenção'}</dd></div></div>
          <div className="flex items-start gap-2"><UserRound className="mt-0.5 h-4 w-4 text-[var(--text-tertiary)]" /><div><dt className="text-xs text-[var(--text-tertiary)]">Responsável</dt><dd>{order.assignedToName ?? 'Ainda sem responsável'}</dd></div></div>
        </dl>
      </Section>

      {/* AÇÕES — Manutenção */}
      {canExecute && order.status === 'ABERTA' && (
        <Section title="Aceitar ordem">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="due" className="ds-field-label">Prazo para executar *</label>
              <input id="due" type="date" className="ds-input" min={toDateInput(new Date())} value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
            {isAdmin && (
              <div>
                <label htmlFor="who" className="ds-field-label">Responsável *</label>
                <select id="who" className="ds-input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                  <option value="">Escolher…</option>
                  {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <Button className="mt-4 w-full sm:w-auto" disabled={busy || !due || (isAdmin && !isManut && !assignee)}
            onClick={() => run(() => acceptServiceOrder(id, { dueDate: new Date(`${due}T23:59:00`).toISOString(), ...(assignee ? { assignedToId: assignee } : {}) }))}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Aceitar e definir prazo
          </Button>
        </Section>
      )}

      {canExecute && order.status === 'ACEITA' && (
        <Section title="Começar o serviço">
          <p className="text-sm text-[var(--text-secondary)]">Marque quando chegar ao local e iniciar a execução.</p>
          <Button className="mt-3 w-full sm:w-auto" disabled={busy} onClick={() => run(() => startServiceOrder(id))}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Iniciar execução
          </Button>
        </Section>
      )}

      {canExecute && (order.status === 'ACEITA' || order.status === 'EM_EXECUCAO') && (
        <Section title="Prestar contas">
          <div className="space-y-3">
            <div>
              <label htmlFor="res" className="ds-field-label">Resultado</label>
              <select id="res" className="ds-input" value={result} onChange={(e) => setResult(e.target.value as ServiceOrderResult)}>
                {(Object.keys(RESULT_LABEL) as ServiceOrderResult[]).map((r) => <option key={r} value={r}>{RESULT_LABEL[r]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="rep" className="ds-field-label">O que foi feito / o que aconteceu *</label>
              <textarea id="rep" className="ds-input min-h-24" value={report} onChange={(e) => setReport(e.target.value)} placeholder="Descreva o serviço. Se não foi possível executar, explique o motivo." />
            </div>
            <label htmlFor="pic-exec" className="ds-btn ds-btn-secondary cursor-pointer">Anexar foto do resultado</label>
            <input id="pic-exec" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
            <Button className="w-full sm:w-auto" disabled={busy || report.trim().length < 10}
              onClick={() => run(() => completeServiceOrder(id, { report: report.trim(), result }), () => setReport(''))}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enviar prestação de contas
            </Button>
          </div>
        </Section>
      )}

      {/* Resultado da manutenção */}
      {order.executionReport && (
        <Section title="Prestação de contas da manutenção">
          <p className="text-sm"><span className="font-semibold">{order.executionResult ? RESULT_LABEL[order.executionResult] : ''}</span>{order.completedAt ? ` · ${fmtDate(order.completedAt, true)}` : ''}</p>
          <p className="mt-2 whitespace-pre-wrap text-[15px] text-[var(--text-primary)]">{order.executionReport}</p>
        </Section>
      )}

      {/* AÇÕES — Quem solicitou */}
      {order.status === 'AGUARDANDO_AVALIACAO' && canEvaluate && (
        <Section title="Avaliar o serviço">
          <div className="space-y-3">
            <div>
              <label htmlFor="ev" className="ds-field-label">O serviço foi executado?</label>
              <select id="ev" className="ds-input" value={evalResult} onChange={(e) => setEvalResult(e.target.value as ServiceOrderResult)}>
                {(Object.keys(RESULT_LABEL) as ServiceOrderResult[]).map((r) => <option key={r} value={r}>{RESULT_LABEL[r]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="evn" className="ds-field-label">Observações {evalResult !== 'EXECUTADO' ? '*' : '(opcional)'}</label>
              <textarea id="evn" className="ds-input min-h-20" value={evalNotes} onChange={(e) => setEvalNotes(e.target.value)} placeholder={evalResult === 'EXECUTADO' ? 'Tudo certo!' : 'O que ficou faltando?'} />
            </div>
            {evalResult !== 'EXECUTADO' && (
              <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <input type="checkbox" checked={reopen} onChange={(e) => setReopen(e.target.checked)} className="h-4 w-4 accent-[var(--brand-600)]" />
                Devolver para a manutenção refazer
              </label>
            )}
            <Button className="w-full sm:w-auto" disabled={busy || (evalResult !== 'EXECUTADO' && !evalNotes.trim())}
              onClick={() => run(() => evaluateServiceOrder(id, { result: evalResult, notes: evalNotes.trim() || undefined, reopen: evalResult !== 'EXECUTADO' ? reopen : undefined }), () => setEvalNotes(''))}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enviar avaliação
            </Button>
          </div>
        </Section>
      )}

      {order.evaluationResult && (
        <Section title="Avaliação">
          <p className="text-sm"><span className="font-semibold">{RESULT_LABEL[order.evaluationResult]}</span>{order.evaluatedByName ? ` · por ${order.evaluatedByName}` : ''}</p>
          {order.evaluationNotes && <p className="mt-2 whitespace-pre-wrap text-[15px]">{order.evaluationNotes}</p>}
        </Section>
      )}

      {/* Gestão: prazo / responsável / prioridade */}
      {canManage && (isMant || isAdmin) && (
        <Section title="Ajustar prazo ou responsável">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="due2" className="ds-field-label">Novo prazo</label>
              <input id="due2" type="date" className="ds-input" min={toDateInput(new Date())} value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
            <div>
              <label htmlFor="who2" className="ds-field-label">Novo responsável</label>
              <select id="who2" className="ds-input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">Manter</option>
                {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <Button variant="outline" className="mt-3" disabled={busy}
            onClick={() => run(() => updateServiceOrder(id, { dueDate: new Date(`${due}T23:59:00`).toISOString(), ...(assignee ? { assignedToId: assignee } : {}) }))}>
            Salvar alteração
          </Button>
        </Section>
      )}

      {/* Fotos */}
      <Section title={`Fotos e anexos (${photos.length})`}>
        {photos.length === 0 && <p className="text-sm text-[var(--text-secondary)]">Nenhum anexo.</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((a) => (
            <a key={a.id} href={attachmentUrl(a.url)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--surface-subtle)]">
              {a.mimeType.startsWith('image/')
                ? <img src={attachmentUrl(a.url)} alt={a.originalName} loading="lazy" className="aspect-square w-full object-cover" />
                : <span className="flex aspect-square items-center justify-center gap-1 text-xs text-[var(--text-secondary)]"><Paperclip className="h-4 w-4" />{a.originalName}</span>}
              <span className="block px-2 py-1 text-[11px] text-[var(--text-tertiary)]">{a.kind === 'EXECUCAO' ? 'Resultado' : 'Pedido'}</span>
            </a>
          ))}
        </div>
        {active && (
          <>
            <label htmlFor="pic-any" className="ds-btn ds-btn-secondary mt-3 cursor-pointer">Adicionar foto</label>
            <input id="pic-any" type="file" accept="image/*,application/pdf" capture="environment" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </>
        )}
      </Section>

      {/* Histórico + comentário */}
      <Section title="Histórico">
        <ol className="space-y-3">
          {(order.events ?? []).map((e) => (
            <li key={e.id} className="border-l-2 border-[var(--border-default)] pl-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{EVENT_LABEL[e.type] ?? e.type}</p>
              {e.message && <p className="mt-0.5 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{e.message}</p>}
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{e.authorName ?? '—'} · {fmtDate(e.createdAt, true)}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex gap-2">
          <input className="ds-input" value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} placeholder="Escrever um comentário…" aria-label="Comentário" />
          <Button variant="outline" disabled={busy || !comment.trim()} onClick={() => run(() => commentServiceOrder(id, comment.trim()), () => setComment(''))}>Enviar</Button>
        </div>
      </Section>

      {/* Cancelar */}
      {!isManut || isAdmin ? (
        active && (
          <div>
            {!showCancel ? (
              <button className="text-sm font-medium text-[var(--error)] underline" onClick={() => setShowCancel(true)}>Cancelar esta ordem</button>
            ) : (
              <div className="space-y-2 rounded-ds-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4">
                <label htmlFor="cr" className="ds-field-label">Motivo do cancelamento *</label>
                <input id="cr" className="ds-input" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" disabled={busy || cancelReason.trim().length < 3} onClick={() => run(() => cancelServiceOrder(id, cancelReason.trim()), () => setShowCancel(false))}>Confirmar cancelamento</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowCancel(false)}>Voltar</Button>
                </div>
              </div>
            )}
          </div>
        )
      ) : null}
          </div>
    </PageShell>
  );
}
