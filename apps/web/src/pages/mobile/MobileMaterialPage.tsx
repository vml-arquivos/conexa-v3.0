/**
 * MobileMaterialPage — Requisição de materiais (PWA)
 * Zero emoji — ícones Lucide exclusivamente.
 */

import { useState } from 'react';
import { Package, BookOpen, Droplets, Trash2, Plus, Send, Check, Loader2, AlertTriangle } from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { MobileField, MobileSaveBar, MobileTextarea, M } from '../../components/mobile/mobileUI';

// Categorias com ícones Lucide
const CATS = [
  {
    id: 'pedagogico', label: 'Pedagógico', Icon: BookOpen,
    itens: [
      { id: 'Cola',         label: 'Cola'          },
      { id: 'Tesoura',      label: 'Tesoura'       },
      { id: 'Tinta guache', label: 'Tinta guache'  },
      { id: 'Papel sulfite',label: 'Papel sulfite' },
      { id: 'EVA',          label: 'EVA'           },
      { id: 'Massinha',     label: 'Massinha'      },
      { id: 'Canetinha',    label: 'Canetinha'     },
      { id: 'Lápis de cor', label: 'Lápis de cor'  },
      { id: 'Cartolina',    label: 'Cartolina'     },
      { id: 'Pincel',       label: 'Pincel'        },
    ],
  },
  {
    id: 'higiene', label: 'Higiene', Icon: Droplets,
    itens: [
      { id: 'Sabonete líquido', label: 'Sabonete líquido' },
      { id: 'Álcool gel',       label: 'Álcool gel'       },
      { id: 'Papel toalha',     label: 'Papel toalha'     },
      { id: 'Fralda',           label: 'Fralda'           },
      { id: 'Lenço umedecido',  label: 'Lenço umedecido'  },
    ],
  },
  {
    id: 'limpeza', label: 'Limpeza', Icon: Trash2,
    itens: [
      { id: 'Papel higiênico', label: 'Papel higiênico' },
      { id: 'Desinfetante',    label: 'Desinfetante'    },
      { id: 'Saco de lixo',    label: 'Saco de lixo'   },
    ],
  },
  { id: 'outro', label: 'Outro', Icon: Package, itens: [] },
];

const PRIOS = [
  { id: 'LOW',    label: 'Baixa',   color: M.color.textMuted },
  { id: 'MEDIUM', label: 'Normal',  color: '#3b82f6'         },
  { id: 'HIGH',   label: 'Urgente', color: M.color.warning   },
];

export default function MobileMaterialPage() {
  const { isOnline, postOfflineSafe } = useOfflineSync();
  const [cat, setCat]       = useState('');
  const [itens, setItens]   = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [prio, setPrio]     = useState('MEDIUM');
  const [obs, setObs]       = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Package size={18} color={M.color.warning} strokeWidth={2} />
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: M.color.text }}>Requisição de Material</h1>
      </div>
      <p style={{ fontSize: 12, color: M.color.textMuted, margin: '0 0 20px' }}>Solicite materiais pedagógicos, de higiene ou limpeza</p>

      {/* Categorias */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${M.color.borderSoft}` }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={13} color={M.color.warning} strokeWidth={2} />
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: M.color.warning, margin: 0, letterSpacing: 0.6, textTransform: 'uppercase' }}>Categoria</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {CATS.map(c => {
            const active = cat === c.id;
            return (
              <button key={c.id} onClick={() => { setCat(c.id); setItens([]); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px', borderRadius: M.radius.lg, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', border: `0.5px solid ${active ? M.color.warning : M.color.border}`, background: active ? '#fffbeb' : M.color.surface, transition: 'all 0.12s' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? `${M.color.warning}20` : M.color.page, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <c.Icon size={18} color={active ? M.color.warning : M.color.textMuted} strokeWidth={1.8} />
                </div>
                <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? '#92400e' : M.color.text }}>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {cat && catInfo && (
        <>
          {/* Itens */}
          {catInfo.itens.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${M.color.borderSoft}` }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: M.color.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={13} color={M.color.textSoft} strokeWidth={2} />
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, color: M.color.textSoft, margin: 0, letterSpacing: 0.6, textTransform: 'uppercase' }}>Itens</p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {catInfo.itens.map(item => {
                  const active = itens.includes(item.id);
                  return (
                    <button key={item.id} onClick={() => toggleItem(item.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: M.radius.full, fontSize: 13, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', border: `0.5px solid ${active ? M.color.warning : M.color.border}`, background: active ? '#fffbeb' : M.color.surface, color: active ? '#92400e' : M.color.textSoft, fontWeight: active ? 600 : 400, transition: 'all 0.12s' }}>
                      {active && <Check size={12} strokeWidth={3} />}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Item customizado */}
          <MobileField label={catInfo.itens.length > 0 ? 'Outro item' : 'Descreva o item *'}>
            <input value={custom} onChange={e => setCustom(e.target.value)}
              placeholder="Ex.: Caneta permanente azul, 10 unidades"
              style={{ width: '100%', boxSizing: 'border-box', padding: '13px 14px', fontSize: 15, border: `0.5px solid ${M.color.border}`, borderRadius: M.radius.md, background: M.color.surface, color: M.color.text, outline: 'none', fontFamily: 'inherit' }} />
          </MobileField>

          {/* Prioridade */}
          <MobileField label="Prioridade">
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIOS.map(p => (
                <button key={p.id} onClick={() => setPrio(p.id)}
                  style={{ flex: 1, padding: '10px 8px', borderRadius: M.radius.md, cursor: 'pointer', fontSize: 13, fontWeight: prio === p.id ? 600 : 400, border: `0.5px solid ${prio === p.id ? p.color : M.color.border}`, background: prio === p.id ? `${p.color}14` : M.color.surface, color: prio === p.id ? p.color : M.color.textSoft, WebkitTapHighlightColor: 'transparent', fontFamily: 'inherit' }}>
                  {p.label}
                </button>
              ))}
            </div>
          </MobileField>

          {/* Observação */}
          <MobileField label="Observação">
            <MobileTextarea value={obs} onChange={setObs}
              placeholder="Quantidade, prazo, substitutos aceitáveis..." rows={3} />
          </MobileField>

          {/* Resumo */}
          {todos.length > 0 && (
            <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: M.radius.md, border: `0.5px solid #fde68a`, marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: '#92400e', margin: '0 0 3px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertTriangle size={13} /> Pedido a enviar:
              </p>
              <p style={{ fontSize: 13, color: M.color.text, margin: 0 }}>{todos.join(', ')}</p>
            </div>
          )}

          <MobileSaveBar label="Enviar requisição" labelDone="Requisição enviada" onClick={salvar}
            disabled={todos.length === 0} saving={saving} saved={saved} isOnline={isOnline}
            color={M.color.warning} />
        </>
      )}
    </div>
  );
}
