import { useState, useEffect } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  Camera,
  Plus,
  Globe,
  Lock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Smile,
  Music,
  BookOpen,
  Users,
  Shapes,
  Leaf,
  Image as ImageIcon,
  X,
  Eye,
  Heart,
} from 'lucide-react';

// ─── Campos de Experiência com ícones e linguagem simples ─────────────────────
const CAMPOS_EXPERIENCIA = [
  {
    id: 'eu-outro-nos',
    label: 'Convivência e Amizade',
    descricao: 'Como as crianças se relacionam, brincam juntas e cuidam umas das outras',
    icon: <Users className="h-6 w-6" />,
    cor: 'bg-pink-100 border-pink-300 text-pink-700',
    corAtivo: 'bg-pink-500 text-white border-pink-500',
    bncc: 'O eu, o outro e o nós',
  },
  {
    id: 'corpo-gestos',
    label: 'Corpo e Movimento',
    descricao: 'Dança, brincadeiras de movimento, expressão corporal',
    icon: <Smile className="h-6 w-6" />,
    cor: 'bg-orange-100 border-orange-300 text-orange-700',
    corAtivo: 'bg-orange-500 text-white border-orange-500',
    bncc: 'Corpo, gestos e movimentos',
  },
  {
    id: 'tracos-sons',
    label: 'Arte e Criatividade',
    descricao: 'Pintura, desenho, música, teatro e criações artísticas',
    icon: <Music className="h-6 w-6" />,
    cor: 'bg-purple-100 border-purple-300 text-purple-700',
    corAtivo: 'bg-purple-500 text-white border-purple-500',
    bncc: 'Traços, sons, cores e formas',
  },
  {
    id: 'escuta-fala',
    label: 'Linguagem e Histórias',
    descricao: 'Contação de histórias, conversas, leitura e escrita',
    icon: <BookOpen className="h-6 w-6" />,
    cor: 'bg-blue-100 border-blue-300 text-blue-700',
    corAtivo: 'bg-blue-500 text-white border-blue-500',
    bncc: 'Escuta, fala, pensamento e imaginação',
  },
  {
    id: 'espacos-tempos',
    label: 'Descobertas e Ciências',
    descricao: 'Exploração da natureza, números, formas e experimentos',
    icon: <Leaf className="h-6 w-6" />,
    cor: 'bg-green-100 border-green-300 text-green-700',
    corAtivo: 'bg-green-500 text-white border-green-500',
    bncc: 'Espaços, tempos, quantidades, relações e transformações',
  },
];

// Tipos de atividade para seleção rápida
const TIPOS_ATIVIDADE = [
  { label: 'Brincadeira livre', emoji: '🎮' },
  { label: 'Atividade dirigida', emoji: '✏️' },
  { label: 'Roda de conversa', emoji: '💬' },
  { label: 'Contação de história', emoji: '📖' },
  { label: 'Atividade de arte', emoji: '🎨' },
  { label: 'Música e dança', emoji: '🎵' },
  { label: 'Atividade ao ar livre', emoji: '🌳' },
  { label: 'Culinária pedagógica', emoji: '🍎' },
  { label: 'Experimento científico', emoji: '🔬' },
  { label: 'Passeio educativo', emoji: '🚌' },
];

interface FotoItem {
  url: string;
  legenda?: string;
  campoExperiencia?: string;
}

interface RelatorioFoto {
  id: string;
  titulo: string;
  descricao?: string;
  dataAtividade: string;
  publicado: boolean;
  classroomId: string;
  fotos: FotoItem[];
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function RdxPage() {
  const [loading, setLoading] = useState(true);
  const [relatorios, setRelatorios] = useState<RelatorioFoto[]>([]);
  const [view, setView] = useState<'lista' | 'novo' | 'detalhe'>('lista');
  const [selected, setSelected] = useState<RelatorioFoto | null>(null);
  const [classrooms, setClassrooms] = useState<Array<{ id: string; name: string }>>([]);

  // Wizard steps
  const [etapa, setEtapa] = useState(1); // 1: tipo, 2: campos, 3: fotos, 4: revisar
  const [form, setForm] = useState({
    classroomId: '',
    tipoAtividade: '',
    campos: [] as string[],
    dataAtividade: new Date().toISOString().split('T')[0],
    fotos: [] as FotoItem[],
    descricao: '',
  });
  const [novaFotoUrl, setNovaFotoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [publicando, setPublicando] = useState(false);

  useEffect(() => {
    loadRelatorios();
    loadClassrooms();
  }, []);

  async function loadRelatorios() {
    try {
      setLoading(true);
      const res = await http.get('/rdx');
      setRelatorios(res.data ?? []);
    } catch {
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  }

  async function loadClassrooms() {
    try {
      const res = await http.get('/classrooms');
      const lista = res.data ?? [];
      setClassrooms(lista);
      if (lista.length > 0) setForm((f) => ({ ...f, classroomId: lista[0].id }));
    } catch { /* silencioso */ }
  }

  function toggleCampo(campoId: string) {
    setForm((f) => ({
      ...f,
      campos: f.campos.includes(campoId)
        ? f.campos.filter((c) => c !== campoId)
        : [...f.campos, campoId],
    }));
  }

  function adicionarFoto() {
    if (!novaFotoUrl.trim()) return;
    const campo = CAMPOS_EXPERIENCIA.find((c) => form.campos[0] === c.id);
    setForm((f) => ({
      ...f,
      fotos: [...f.fotos, { url: novaFotoUrl.trim(), campoExperiencia: campo?.bncc }],
    }));
    setNovaFotoUrl('');
    toast.success('Foto adicionada!');
  }

  function removerFoto(idx: number) {
    setForm((f) => ({ ...f, fotos: f.fotos.filter((_, i) => i !== idx) }));
  }

  async function publicar() {
    if (!form.tipoAtividade) { toast.error('Escolha o tipo de atividade'); return; }
    if (form.campos.length === 0) { toast.error('Escolha pelo menos uma área de aprendizado'); return; }

    const campo = CAMPOS_EXPERIENCIA.find((c) => form.campos[0] === c.id);
    const titulo = `${form.tipoAtividade} — ${campo?.label ?? 'Atividade'}`;

    try {
      setSaving(true);
      const res = await http.post('/rdx', {
        classroomId: form.classroomId,
        titulo,
        descricao: form.descricao || form.tipoAtividade,
        dataAtividade: form.dataAtividade,
        fotos: form.fotos,
      });
      toast.success('Relatório criado! 📸');
      setRelatorios((prev) => [res.data, ...prev]);
      setView('lista');
      resetForm();
    } catch {
      toast.error('Erro ao criar relatório');
    } finally {
      setSaving(false);
    }
  }

  async function publicarParaFamilias(id: string) {
    try {
      setPublicando(true);
      await http.patch(`/rdx/${id}/publicar`);
      toast.success('Compartilhado com as famílias! 🎉');
      loadRelatorios();
    } catch {
      toast.error('Erro ao compartilhar');
    } finally {
      setPublicando(false);
    }
  }

  function resetForm() {
    setForm({ classroomId: classrooms[0]?.id ?? '', tipoAtividade: '', campos: [], dataAtividade: new Date().toISOString().split('T')[0], fotos: [], descricao: '' });
    setEtapa(1);
    setNovaFotoUrl('');
  }

  if (loading) return <LoadingState message="Carregando registros de atividades..." />;

  // ─── Detalhe ──────────────────────────────────────────────────────────────────
  if (view === 'detalhe' && selected) {
    const d = new Date(selected.dataAtividade + 'T12:00:00');
    return (
      <PageShell
        title={selected.titulo}
        description={`${d.getDate()} de ${MESES[d.getMonth()]} · ${selected.fotos.length} foto(s)`}
        headerActions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setView('lista')}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            {!selected.publicado && (
              <Button
                size="sm"
                onClick={() => publicarParaFamilias(selected.id)}
                disabled={publicando}
                className="bg-green-600 hover:bg-green-700"
              >
                <Heart className="h-4 w-4 mr-1" />
                Compartilhar com as famílias
              </Button>
            )}
          </div>
        }
      >
        {selected.publicado && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">Este registro já foi compartilhado com as famílias</span>
          </div>
        )}

        {selected.descricao && (
          <p className="text-gray-600 mb-6">{selected.descricao}</p>
        )}

        {selected.fotos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhuma foto neste registro</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {selected.fotos.map((foto, idx) => (
              <div key={idx} className="rounded-2xl overflow-hidden border bg-gray-50">
                <div className="aspect-square overflow-hidden">
                  <img src={foto.url} alt={foto.legenda ?? `Foto ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
                {foto.campoExperiencia && (
                  <div className="p-2">
                    <span className="text-xs text-gray-500">{foto.campoExperiencia}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </PageShell>
    );
  }

  // ─── Wizard: Novo Registro ────────────────────────────────────────────────────
  if (view === 'novo') {
    return (
      <PageShell
        title="Registrar Atividade"
        description={`Passo ${etapa} de 4`}
        headerActions={
          <Button variant="outline" size="sm" onClick={() => { setView('lista'); resetForm(); }}>
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
        }
      >
        {/* Indicador de progresso */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`flex-1 h-2 rounded-full transition-all ${
                n <= etapa ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* ETAPA 1: Tipo de atividade */}
        {etapa === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">O que a turma fez hoje?</h2>
              <p className="text-gray-500 text-sm">Toque para escolher o tipo de atividade</p>
            </div>

            {/* Seleção de turma */}
            {classrooms.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {classrooms.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setForm((f) => ({ ...f, classroomId: c.id }))}
                    className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                      form.classroomId === c.id
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Grid de tipos */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TIPOS_ATIVIDADE.map((tipo) => (
                <button
                  key={tipo.label}
                  onClick={() => setForm((f) => ({ ...f, tipoAtividade: tipo.label }))}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    form.tipoAtividade === tipo.label
                      ? 'bg-blue-500 text-white border-blue-500 shadow-md scale-105'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="text-3xl mb-2">{tipo.emoji}</div>
                  <p className="text-sm font-semibold leading-tight">{tipo.label}</p>
                </button>
              ))}
            </div>

            {/* Data */}
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-2">Quando foi?</label>
              <input
                type="date"
                className="px-4 py-3 border-2 rounded-xl text-sm w-full max-w-xs"
                value={form.dataAtividade}
                onChange={(e) => setForm((f) => ({ ...f, dataAtividade: e.target.value }))}
              />
            </div>

            <Button
              onClick={() => { if (!form.tipoAtividade) { toast.error('Escolha o tipo de atividade'); return; } setEtapa(2); }}
              size="lg"
              className="w-full h-14 text-base font-bold rounded-2xl"
              disabled={!form.tipoAtividade}
            >
              Próximo <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
        )}

        {/* ETAPA 2: Campos de Experiência */}
        {etapa === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">O que as crianças aprenderam?</h2>
              <p className="text-gray-500 text-sm">Pode escolher mais de uma área</p>
            </div>

            <div className="space-y-3">
              {CAMPOS_EXPERIENCIA.map((campo) => {
                const ativo = form.campos.includes(campo.id);
                return (
                  <button
                    key={campo.id}
                    onClick={() => toggleCampo(campo.id)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${
                      ativo ? campo.corAtivo : campo.cor.replace('text-', 'border-').replace('bg-', 'bg-') + ' bg-white border-gray-200 hover:border-current'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${ativo ? 'bg-white/20' : campo.cor}`}>
                      {campo.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{campo.label}</p>
                      <p className={`text-xs mt-0.5 ${ativo ? 'opacity-80' : 'text-gray-500'}`}>{campo.descricao}</p>
                    </div>
                    {ativo && <CheckCircle className="h-6 w-6 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEtapa(1)} className="flex-1 h-12 rounded-2xl">
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button
                onClick={() => { if (form.campos.length === 0) { toast.error('Escolha pelo menos uma área'); return; } setEtapa(3); }}
                className="flex-1 h-12 rounded-2xl font-bold"
                disabled={form.campos.length === 0}
              >
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 3: Fotos */}
        {etapa === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Adicione as fotos</h2>
              <p className="text-gray-500 text-sm">Cole o link (URL) de cada foto da atividade</p>
            </div>

            {/* Fotos adicionadas */}
            {form.fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {form.fotos.map((foto, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200">
                    <img src={foto.url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removerFoto(idx)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Adicionar foto */}
            <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-200 space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-semibold text-blue-700">Adicionar foto</span>
              </div>
              <input
                className="w-full px-4 py-3 border-2 rounded-xl text-sm"
                placeholder="Cole o link da foto aqui..."
                value={novaFotoUrl}
                onChange={(e) => setNovaFotoUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adicionarFoto()}
              />
              <Button
                onClick={adicionarFoto}
                disabled={!novaFotoUrl.trim()}
                className="w-full rounded-xl"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-1" /> Adicionar foto
              </Button>
            </div>

            {form.fotos.length === 0 && (
              <div className="text-center py-4 text-gray-400 text-sm">
                Você pode continuar sem fotos, mas elas enriquecem o registro!
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEtapa(2)} className="flex-1 h-12 rounded-2xl">
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={() => setEtapa(4)} className="flex-1 h-12 rounded-2xl font-bold">
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 4: Revisar e publicar */}
        {etapa === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Tudo certo! Revise antes de salvar</h2>
              <p className="text-gray-500 text-sm">Confira as informações do registro</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-xs text-gray-500 mb-1">Atividade</p>
                <p className="font-bold text-gray-800">{form.tipoAtividade}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-xs text-gray-500 mb-2">Áreas de aprendizado</p>
                <div className="flex flex-wrap gap-2">
                  {form.campos.map((id) => {
                    const campo = CAMPOS_EXPERIENCIA.find((c) => c.id === id);
                    return campo ? (
                      <span key={id} className={`px-3 py-1 rounded-full text-xs font-medium border ${campo.cor}`}>
                        {campo.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-xs text-gray-500 mb-1">Fotos</p>
                <p className="font-bold text-gray-800">{form.fotos.length} foto(s) adicionada(s)</p>
              </div>

              {/* Observação opcional */}
              <div className="p-4 bg-blue-50 rounded-2xl">
                <p className="text-xs text-blue-600 font-medium mb-2">Quer adicionar uma observação? (opcional)</p>
                <textarea
                  className="w-full px-3 py-2 border rounded-xl text-sm resize-none"
                  rows={3}
                  placeholder="Ex: As crianças adoraram! Ficaram muito engajadas..."
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEtapa(3)} className="flex-1 h-12 rounded-2xl">
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button
                onClick={publicar}
                disabled={saving}
                className="flex-1 h-12 rounded-2xl font-bold bg-green-600 hover:bg-green-700"
              >
                {saving ? 'Salvando...' : '✅ Salvar Registro'}
              </Button>
            </div>
          </div>
        )}
      </PageShell>
    );
  }

  // ─── Lista de Registros ───────────────────────────────────────────────────────
  return (
    <PageShell
      title="Registros de Atividades"
      description="Fotos e memórias das atividades da turma"
      headerActions={
        <Button onClick={() => { setView('novo'); resetForm(); }} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />
          Registrar Atividade
        </Button>
      }
    >
      {relatorios.length === 0 ? (
        <div className="text-center py-16">
          <Camera className="w-20 h-20 mx-auto mb-4 text-gray-200" />
          <p className="text-xl font-bold text-gray-400 mb-2">Nenhum registro ainda</p>
          <p className="text-gray-400 text-sm mb-8">Registre a primeira atividade da turma com fotos!</p>
          <Button onClick={() => { setView('novo'); resetForm(); }} size="lg" className="rounded-2xl px-8">
            <Camera className="h-5 w-5 mr-2" />
            Criar Primeiro Registro
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {relatorios.map((r) => {
            const d = new Date(r.dataAtividade + 'T12:00:00');
            return (
              <Card
                key={r.id}
                className="cursor-pointer hover:shadow-lg transition-all rounded-2xl overflow-hidden border-2 hover:border-blue-300"
                onClick={() => { setSelected(r); setView('detalhe'); }}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden">
                  {r.fotos.length > 0 && r.fotos[0].url ? (
                    <img src={r.fotos[0].url} alt={r.titulo} className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-12 w-12 text-blue-300" />
                  )}
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-sm leading-tight line-clamp-2">{r.titulo}</h3>
                    <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${r.publicado ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {r.publicado ? <Globe className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-gray-400" />}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mb-3">
                    {d.getDate()} de {MESES[d.getMonth()]} · {r.fotos.length} foto(s)
                  </p>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-xl text-xs"
                      onClick={(e) => { e.stopPropagation(); setSelected(r); setView('detalhe'); }}
                    >
                      <Eye className="h-3 w-3 mr-1" /> Ver
                    </Button>
                    {!r.publicado && (
                      <Button
                        size="sm"
                        className="flex-1 rounded-xl text-xs bg-green-600 hover:bg-green-700"
                        onClick={(e) => { e.stopPropagation(); publicarParaFamilias(r.id); }}
                        disabled={publicando}
                      >
                        <Heart className="h-3 w-3 mr-1" /> Compartilhar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
