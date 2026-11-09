import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Loader2, X } from 'lucide-react';
import { PageShell } from '../../components/ui/PageShell';
import { Button } from '../../components/ui/button';
import { UnitSelect } from '../../components/select/UnitSelect';
import { useAuth } from '../../app/AuthProvider';
import { normalizeRoles } from '../../app/RoleProtectedRoute';
import {
  createServiceOrder, uploadServiceOrderFile,
  type ServiceOrderCategory, type ServiceOrderPriority,
} from '../../api/service-orders';
import { CATEGORY_LABEL, PRIORITY_LABEL } from './osMeta';

const MAX_FILES = 5;

export default function OrdemServicoNovaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const levels = normalizeRoles(user);
  const needsUnit = levels.some((l) => l === 'DEVELOPER' || l === 'MANTENEDORA');

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ServiceOrderCategory>('OUTRO');
  const [priority, setPriority] = useState<ServiceOrderPriority>('MEDIA');
  const [unitId, setUnitId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const valid =
    title.trim().length >= 3 && location.trim().length >= 2 && description.trim().length >= 5 && (!needsUnit || !!unitId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const order = await createServiceOrder({
        title: title.trim(), location: location.trim(), description: description.trim(),
        category, priority, ...(needsUnit ? { unitId } : {}),
      });
      // Fotos: se uma falhar, a ordem já foi criada; avisamos na tela de detalhe.
      let failed = 0;
      for (const f of files) {
        try { await uploadServiceOrderFile(order.id, f); } catch { failed += 1; }
      }
      navigate(`/app/ordens-servico/${order.id}`, { state: failed ? { photoErrors: failed } : undefined });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' · ') : msg || 'Não foi possível enviar a ordem. Tente novamente.');
      setSaving(false);
    }
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, MAX_FILES));
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <PageShell title="Nova ordem de serviço" subtitle="Descreva o que precisa ser consertado. A manutenção recebe na hora." headerActions={
      <Button asChild variant="outline" size="sm"><Link to="/app/ordens-servico">Voltar</Link></Button>
    }>
      <form onSubmit={submit} className="mx-auto w-full max-w-2xl space-y-5 rounded-ds-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-ds-xs sm:p-6">
        {needsUnit && (
          <div>
            <label className="ds-field-label">Unidade *</label>
            <UnitSelect value={unitId} onChange={setUnitId} />
          </div>
        )}

        <div>
          <label htmlFor="os-title" className="ds-field-label">O que precisa ser feito? *</label>
          <input id="os-title" className="ds-input" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Trocar lâmpada queimada" />
        </div>

        <div>
          <label htmlFor="os-location" className="ds-field-label">Onde? *</label>
          <input id="os-location" className="ds-input" maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex.: Sala 3, banheiro infantil, pátio" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="os-cat" className="ds-field-label">Tipo de serviço</label>
            <select id="os-cat" className="ds-input" value={category} onChange={(e) => setCategory(e.target.value as ServiceOrderCategory)}>
              {(Object.keys(CATEGORY_LABEL) as ServiceOrderCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="os-prio" className="ds-field-label">Urgência</label>
            <select id="os-prio" className="ds-input" value={priority} onChange={(e) => setPriority(e.target.value as ServiceOrderPriority)}>
              {(Object.keys(PRIORITY_LABEL) as ServiceOrderPriority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
            {priority === 'URGENTE' && (
              <p className="mt-1.5 text-xs text-[var(--warning)]">Use “Urgente” só quando há risco para crianças ou funcionários.</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="os-desc" className="ds-field-label">Detalhes *</label>
          <textarea id="os-desc" className="ds-input min-h-28" maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Conte o que aconteceu e o que você precisa." />
        </div>

        <div>
          <span className="ds-field-label">Fotos (opcional, até {MAX_FILES})</span>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="sr-only" id="os-photos" onChange={(e) => addFiles(e.target.files)} />
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="os-photos" className="ds-btn ds-btn-secondary cursor-pointer">
              <Camera className="h-4 w-4" /> Tirar / escolher foto
            </label>
            {files.map((f, i) => (
              <span key={`${f.name}-${i}`} className="ds-badge ds-badge-neutral gap-1.5">
                <span className="max-w-32 truncate">{f.name}</span>
                <button type="button" aria-label={`Remover ${f.name}`} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        </div>

        {error && <div role="alert" className="ds-alert ds-alert-error">{error}</div>}

        <div className="flex justify-end gap-2 pt-1">
          <Button asChild variant="outline"><Link to="/app/ordens-servico">Cancelar</Link></Button>
          <Button type="submit" disabled={!valid || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Enviando…' : 'Enviar ordem'}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
