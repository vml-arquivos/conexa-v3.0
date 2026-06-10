/**
 * MobileMaterialPage — Requisição de material mobile
 * Professor solicita material pedagógico ou de higiene em poucos toques
 */

import { useState } from 'react';
import { Package, Loader2, Send } from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';

const CATEGORIAS = [
  { id: 'pedagogico', label: 'Pedagógico', emoji: '📚', itens: ['Cola', 'Tesoura', 'Tinta guache', 'Papel sulfite', 'EVA', 'Massinha', 'Canetinha', 'Lápis de cor', 'Cartolina', 'Pincel'] },
  { id: 'higiene', label: 'Higiene pessoal', emoji: '🧴', itens: ['Sabonete líquido', 'Álcool gel', 'Papel toalha', 'Fralda', 'Lenço umedecido', 'Xampu', 'Condicionador', 'Pente'] },
  { id: 'limpeza', label: 'Limpeza', emoji: '🧹', itens: ['Papel higiênico', 'Detergente', 'Desinfetante', 'Saco de lixo', 'Esponja'] },
  { id: 'outro', label: 'Outro', emoji: '📦', itens: [] },
];

const PRIORIDADES = [
  { id: 'LOW', label: 'Baixa', color: '#6b7280' },
  { id: 'MEDIUM', label: 'Normal', color: '#3b82f6' },
  { id: 'HIGH', label: 'Urgente', color: '#f59e0b' },
];

export default function MobileMaterialPage() {
  const { isOnline, postOfflineSafe } = useOfflineSync();
  const [categoria, setCategoria] = useState('');
  const [itensSelecionados, setItensSelecionados] = useState<string[]>([]);
  const [itemCustom, setItemCustom] = useState('');
  const [prioridade, setPrioridade] = useState('MEDIUM');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const catInfo = CATEGORIAS.find((c) => c.id === categoria);

  const toggleItem = (item: string) => {
    setItensSelecionados((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
    setSaved(false);
  };

  const salvar = async () => {
    const todos = [...itensSelecionados, ...(itemCustom.trim() ? [itemCustom.trim()] : [])];
    if (!categoria || todos.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        title: todos.length === 1 ? todos[0] : `${todos.length} itens — ${catInfo?.label}`,
        description: todos.join(', ') + (observacao ? `\n${observacao}` : ''),
        category: categoria,
        priority: prioridade,
        items: todos.map((nome) => ({ nome, quantidade: 1 })),
        requestedDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      };
      await postOfflineSafe('requisicao', '/material-requests', 'POST', payload);
      setSaved(true);
      setCategoria(''); setItensSelecionados([]); setItemCustom(''); setObservacao('');
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '16px 16px 120px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 2px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Package size={20} /> Requisição
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
          Solicitar materiais · {isOnline ? '🟢' : '🔴 offline'}
        </p>
      </div>

      {/* Categorias */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {CATEGORIAS.map((cat) => (
          <button key={cat.id} onClick={() => { setCategoria(cat.id); setItensSelecionados([]); }}
            style={{
              padding: '14px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'center',
              border: `0.5px solid ${categoria === cat.id ? '#4f46e5' : 'var(--color-border-tertiary)'}`,
              background: categoria === cat.id ? '#eef2ff' : 'var(--color-background-primary)',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{cat.emoji}</div>
            <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: categoria === cat.id ? '#4338ca' : 'var(--color-text-primary)' }}>{cat.label}</p>
          </button>
        ))}
      </div>

      {categoria && catInfo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Itens */}
          {catInfo.itens.length > 0 && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>Selecione os itens *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {catInfo.itens.map((item) => (
                  <button key={item} onClick={() => toggleItem(item)}
                    style={{
                      padding: '8px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                      border: `0.5px solid ${itensSelecionados.includes(item) ? '#4f46e5' : 'var(--color-border-tertiary)'}`,
                      background: itensSelecionados.includes(item) ? '#eef2ff' : 'var(--color-background-primary)',
                      color: itensSelecionados.includes(item) ? '#4338ca' : 'var(--color-text-primary)',
                      fontWeight: itensSelecionados.includes(item) ? 500 : 400,
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                    {itensSelecionados.includes(item) ? '✓ ' : ''}{item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Item customizado */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
              {catInfo.itens.length > 0 ? 'Ou descreva outro item' : 'Descreva o item necessário *'}
            </label>
            <input value={itemCustom} onChange={(e) => setItemCustom(e.target.value)}
              placeholder="Ex.: Caneta permanente azul, quantidade: 10"
              style={{ width: '100%', padding: '12px 14px', fontSize: 15, border: '0.5px solid var(--color-border-secondary)', borderRadius: 12, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>

          {/* Prioridade */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>Prioridade</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIORIDADES.map((p) => (
                <button key={p.id} onClick={() => setPrioridade(p.id)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                    border: `0.5px solid ${prioridade === p.id ? p.color : 'var(--color-border-tertiary)'}`,
                    background: prioridade === p.id ? `${p.color}18` : 'var(--color-background-primary)',
                    color: prioridade === p.id ? p.color : 'var(--color-text-secondary)',
                    fontSize: 13, fontWeight: prioridade === p.id ? 600 : 400,
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Observação */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Observação (opcional)</label>
            <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)}
              placeholder="Quantidade específica, prazo, substitutos aceitáveis..."
              rows={3}
              style={{ width: '100%', padding: '12px 14px', fontSize: 15, border: '0.5px solid var(--color-border-secondary)', borderRadius: 12, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          {/* Resumo */}
          {(itensSelecionados.length > 0 || itemCustom.trim()) && (
            <div style={{ padding: '12px 14px', background: 'var(--color-background-secondary)', borderRadius: 12, border: '0.5px solid var(--color-border-tertiary)' }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>Resumo do pedido:</p>
              <p style={{ fontSize: 14, color: 'var(--color-text-primary)', margin: 0 }}>
                {[...itensSelecionados, itemCustom.trim()].filter(Boolean).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Botão enviar */}
      {categoria && (
        <div style={{ position: 'fixed', bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))', left: 0, right: 0, padding: '12px 16px', background: 'var(--color-background-primary)', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <button onClick={salvar}
            disabled={saving || (itensSelecionados.length === 0 && !itemCustom.trim())}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: saved ? '#10b981' : '#4f46e5', color: '#fff',
              fontSize: 15, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: (saving || (itensSelecionados.length === 0 && !itemCustom.trim())) ? 0.6 : 1,
            }}>
            {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
            {saved ? '✓ Requisição enviada' : isOnline ? 'Enviar requisição' : 'Salvar offline'}
          </button>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
