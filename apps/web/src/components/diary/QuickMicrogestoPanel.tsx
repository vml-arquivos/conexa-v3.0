import { useState } from 'react';
import { MICROGESTO_CATALOGO, MICROGESTO_POR_CATEGORIA, CATEGORIA_LABELS } from '../../constants/microgestos.constants';

interface Props {
  criancas: Array<{ id: string; firstName: string; lastName: string }>;
  classroomId: string;
  data: string;
  onRegistrar: (registro: {
    childIds: string[];
    categoria: string;
    microgestoId: string;
    nivel: string;
    descricao?: string;
    campoExperiencia?: string;
  }) => void;
}

export function QuickMicrogestoPanel({ criancas, classroomId, data, onRegistrar }: Props) {
  const [categoriaSel, setCategoriaSel] = useState<string>('');
  const [microgestoSel, setMicrogestoSel] = useState<string>('');
  const [nivelSel, setNivelSel] = useState<string>('');
  const [criancasSel, setCriancasSel] = useState<string[]>([]);
  const [descricao, setDescricao] = useState('');

  const microgestosCategoria = categoriaSel
    ? (MICROGESTO_POR_CATEGORIA[categoriaSel] ?? [])
    : [];
  const microgestoAtual = MICROGESTO_CATALOGO.find(m => m.id === microgestoSel);

  function toggleCrianca(id: string) {
    setCriancasSel(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  function handleRegistrar() {
    if (!microgestoSel || !nivelSel || criancasSel.length === 0) return;
    onRegistrar({
      childIds: criancasSel,
      categoria: categoriaSel,
      microgestoId: microgestoSel,
      nivel: nivelSel,
      descricao: descricao.trim() || undefined,
    });
    setMicrogestoSel('');
    setNivelSel('');
    setCriancasSel([]);
    setDescricao('');
  }

  return (
    <div className="space-y-4">
      {/* PASSO 1: Categoria */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
          1. Área de Desenvolvimento
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORIA_LABELS).map(([key, val]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setCategoriaSel(key); setMicrogestoSel(''); setNivelSel(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                categoriaSel === key
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
              }`}
            >
              {val.emoji} {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* PASSO 2: Microgesto específico */}
      {categoriaSel && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            2. Habilidade Observada
          </p>
          <div className="flex flex-wrap gap-2">
            {microgestosCategoria.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setMicrogestoSel(m.id); setNivelSel(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  microgestoSel === m.id
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
                }`}
                title={m.desc}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PASSO 3: Nível */}
      {microgestoAtual && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            3. Nível
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(microgestoAtual.niveis).map(([nivel, desc]) => {
              const cores: Record<string, string> = {
                ALCANCADO:         'bg-emerald-600 border-emerald-600 text-white',
                EM_DESENVOLVIMENTO: 'bg-amber-500 border-amber-500 text-white',
                REQUER_ATENCAO:    'bg-rose-500 border-rose-500 text-white',
              };
              const coresIdle: Record<string, string> = {
                ALCANCADO:         'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                EM_DESENVOLVIMENTO: 'border-amber-200 text-amber-700 hover:bg-amber-50',
                REQUER_ATENCAO:    'border-rose-200 text-rose-700 hover:bg-rose-50',
              };
              return (
                <button
                  key={nivel}
                  type="button"
                  onClick={() => setNivelSel(nivel)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    nivelSel === nivel ? cores[nivel] : `bg-white ${coresIdle[nivel]}`
                  }`}
                  title={desc as string}
                >
                  {nivel === 'ALCANCADO' ? '✅' : nivel === 'EM_DESENVOLVIMENTO' ? '🟡' : '🔴'}{' '}
                  {desc as string}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PASSO 4: Crianças */}
      {nivelSel && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            4. Criança(s)
          </p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {criancas.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCrianca(c.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  criancasSel.includes(c.id)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {c.firstName} {c.lastName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PASSO 5: Observação livre (opcional) */}
      {criancasSel.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
            5. Observação complementar (opcional)
          </p>
          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Detalhe específico sobre o momento observado..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            maxLength={300}
          />
        </div>
      )}

      {/* Botão Registrar */}
      {criancasSel.length > 0 && nivelSel && (
        <button
          type="button"
          onClick={handleRegistrar}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          ✦ Registrar Microgesto ({criancasSel.length} criança{criancasSel.length > 1 ? 's' : ''})
        </button>
      )}
    </div>
  );
}
