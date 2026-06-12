import { useState } from 'react';
import { Package } from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { MobilePageHeader, MobileField, MobileSaveBar, MobileTextarea, ChipGroup, M } from '../../components/mobile/mobileUI';

const CATS = [
  { id: 'pedagogico', label: 'Pedagógico', emoji: '📚',
    itens: [
      { id: 'Cola', label: 'Cola', emoji: '🔧' },
      { id: 'Tesoura', label: 'Tesoura', emoji: '✂️' },
      { id: 'Tinta guache', label: 'Tinta guache', emoji: '🎨' },
      { id: 'Papel sulfite', label: 'Papel sulfite', emoji: '📄' },
      { id: 'EVA', label: 'EVA', emoji: '🟢' },
      { id: 'Massinha', label: 'Massinha', emoji: '🟤' },
      { id: 'Canetinha', label: 'Canetinha', emoji: '🖊️' },
      { id: 'Lápis de cor', label: 'Lápis de cor', emoji: '✏️' },
      { id: 'Cartolina', label: 'Cartolina', emoji: '📋' },
      { id: 'Pincel', label: 'Pincel', emoji: '🖌️' },
    ],
  },
  { id: 'higiene', label: 'Higiene', emoji: '🧴',
    itens: [
      { id: 'Sabonete líquido', label: 'Sabonete', emoji: '🧼' },
      { id: 'Álcool gel', label: 'Álcool gel', emoji: '🧴' },
      { id: 'Papel toalha', label: 'Papel toalha', emoji: '🗒️' },
      { id: 'Fralda', label: 'Fralda', emoji: '👶' },
      { id: 'Lenço umedecido', label: 'Lenço', emoji: '💧' },
    ],
  },
  { id: 'limpeza', label: 'Limpeza', emoji: '🧹',
    itens: [
      { id: 'Papel higiênico', label: 'Papel higiênico', emoji: '🧻' },
      { id: 'Desinfetante', label: 'Desinfetante', emoji: '🧪' },
      { id: 'Saco de lixo', label: 'Saco de lixo', emoji: '🗑️' },
    ],
  },
  { id: 'outro', label: 'Outro', emoji: '📦', itens: [] },
];

const PRIOS = [
  { id: 'LOW',    label: 'Baixa',  color: M.color.textMuted },
  { id: 'MEDIUM', label: 'Normal', color: '#3b82f6' },
  { id: 'HIGH',   label: 'Urgente', color: M.color.warning },
];

export default function MobileMaterialPage() {
  const { isOnline, postOfflineSafe } = useOfflineSync();
  const [cat, setCat] = useState('');
  const [itens, setItens] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [prio, setPrio] = useState('MEDIUM');
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const catInfo = CATS.find(c => c.id === cat);
  const toggleItem = (id: string) => setItens(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  const todos = [...itens, ...(custom.trim() ? [custom.trim()] : [])];

  const salvar = async () => {
    if (!cat || todos.length === 0) return;
    setSaving(true);
    try {
      await postOfflineSafe('requisicao', '/material-requests', 'POST', {
        title: todos.length === 1 ? todos[0] : `${todos.length} itens — ${catInfo?.label}`,
        description: todos.join(', ') + (obs ? `\n${obs}` : ''),
        category: cat, priority: prio,
        items: todos.map(n => ({ nome: n, quantidade: 1 })),
      });
      setSaved(true);
      setCat(''); setItens([]); setCustom(''); setObs('');
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '16px 16px 90px', minHeight: '100%', background: M.color.page }}>
      <MobilePageHeader title="Requisição" subtitle="Solicitar materiais" icon={Package} color={M.color.warning} />

      {/* Categorias */}
      <MobileField label="Categoria">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {CATS.map(c => (
            <button key={c.id} onClick={() => { setCat(c.id); setItens([]); }} style={{
              padding: '14px 10px', borderRadius: M.radius.lg, cursor: 'pointer', textAlign: 'center',
              border: `0.5px solid ${cat === c.id ? M.color.warning : M.color.border}`,
              background: cat === c.id ? M.color.warningBg : M.color.surface,
              WebkitTapHighlightColor: 'transparent',
            }}>
              <div style={{ fontSize: 28, marginBottom: 5 }}>{c.emoji}</div>
              <p style={{ fontSize: M.font.md, fontWeight: 500, margin: 0, color: cat === c.id ? '#92400e' : M.color.text }}>{c.label}</p>
            </button>
          ))}
        </div>
      </MobileField>

      {cat && catInfo && (
        <>
          {catInfo.itens.length > 0 && (
            <MobileField label="Itens">
              <ChipGroup options={catInfo.itens} selected={itens} onToggle={toggleItem} multi color={M.color.warning} />
            </MobileField>
          )}

          <MobileField label={catInfo.itens.length > 0 ? 'Ou descreva outro item' : 'Descreva o item *'}>
            <input
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="Ex.: Caneta permanente azul, 10 unidades"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '13px 14px', fontSize: 15,
                border: `0.5px solid ${M.color.border}`, borderRadius: M.radius.md,
                background: M.color.surface, color: M.color.text, outline: 'none',
              }}
            />
          </MobileField>

          <MobileField label="Prioridade">
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIOS.map(p => (
                <button key={p.id} onClick={() => setPrio(p.id)} style={{
                  flex: 1, padding: 10, borderRadius: M.radius.md, cursor: 'pointer',
                  border: `0.5px solid ${prio === p.id ? p.color : M.color.border}`,
                  background: prio === p.id ? `${p.color}14` : M.color.surface,
                  color: prio === p.id ? p.color : M.color.textSoft,
                  fontSize: M.font.md, fontWeight: prio === p.id ? 600 : 400,
                  WebkitTapHighlightColor: 'transparent',
                }}>{p.label}</button>
              ))}
            </div>
          </MobileField>

          <MobileField label="Observação">
            <MobileTextarea value={obs} onChange={setObs} placeholder="Quantidade, prazo, substitutos aceitáveis..." rows={3} />
          </MobileField>

          {todos.length > 0 && (
            <div style={{ padding: '10px 14px', background: M.color.warningBg, borderRadius: M.radius.md, border: `0.5px solid #fde68a`, marginBottom: 14 }}>
              <p style={{ fontSize: M.font.sm, color: '#92400e', margin: '0 0 3px', fontWeight: 600 }}>Pedido:</p>
              <p style={{ fontSize: M.font.md, color: M.color.text, margin: 0 }}>{todos.join(', ')}</p>
            </div>
          )}

          <MobileSaveBar label="Enviar requisição" labelDone="✓ Requisição enviada" onClick={salvar} disabled={todos.length === 0} saving={saving} saved={saved} isOnline={isOnline} color={M.color.warning} />
        </>
      )}
    </div>
  );
}
