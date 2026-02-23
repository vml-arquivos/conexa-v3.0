import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import http from '../../api/http';
import { MessageSquare, Bell, BellOff, Plus, CheckCheck, AlertCircle, X, RefreshCw } from 'lucide-react';

interface Recado {
  id: string;
  titulo: string;
  mensagem: string;
  importante: boolean;
  criadoEm: string;
  lido: boolean;
  lidoEm?: string;
  destinatario: string;
  classroomId?: string;
  expiresAt?: string;
}

interface RecadosWidgetProps {
  /** Se true, exibe o formulário de criação de recados (coordenadora) */
  podeEnviar?: boolean;
  /** ID da unidade (necessário para enviar recados) */
  unitId?: string;
  /** Lista de turmas disponíveis para seleção */
  turmas?: { id: string; name: string }[];
  /** Título do widget */
  titulo?: string;
}

export function RecadosWidget({ podeEnviar = false, unitId, turmas = [], titulo = 'Recados' }: RecadosWidgetProps) {
  const [recados, setRecados] = useState<Recado[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [naoLidos, setNaoLidos] = useState(0);

  const [form, setForm] = useState({
    titulo: '',
    mensagem: '',
    importante: false,
    destinatario: 'TODAS_PROFESSORAS',
    classroomId: '',
    expiresAt: '',
  });

  useEffect(() => {
    loadRecados();
  }, []);

  async function loadRecados() {
    setLoading(true);
    try {
      const res = await http.get('/recados');
      const lista: Recado[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setRecados(lista);
      setNaoLidos(lista.filter(r => !r.lido).length);
    } catch {
      setRecados([]);
    } finally {
      setLoading(false);
    }
  }

  async function marcarLido(id: string) {
    try {
      await http.patch(`/recados/${id}/lido`, {});
      setRecados(r => r.map(rec => rec.id === id ? { ...rec, lido: true, lidoEm: new Date().toISOString() } : rec));
      setNaoLidos(n => Math.max(0, n - 1));
    } catch {
      // silencioso
    }
  }

  async function enviarRecado() {
    if (!form.titulo.trim()) { toast.error('Informe o título do recado'); return; }
    if (!form.mensagem.trim()) { toast.error('Informe a mensagem'); return; }
    if (!unitId) { toast.error('Unidade não identificada'); return; }
    setSaving(true);
    try {
      await http.post('/recados', {
        unitId,
        titulo: form.titulo,
        mensagem: form.mensagem,
        importante: form.importante,
        destinatario: form.destinatario,
        classroomId: form.classroomId || null,
        expiresAt: form.expiresAt || null,
      });
      toast.success('Recado enviado com sucesso!');
      setForm({ titulo: '', mensagem: '', importante: false, destinatario: 'TODAS_PROFESSORAS', classroomId: '', expiresAt: '' });
      setMostrarForm(false);
      loadRecados();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao enviar recado');
    } finally {
      setSaving(false);
    }
  }

  async function deletarRecado(id: string) {
    try {
      await http.delete(`/recados/${id}`);
      setRecados(r => r.filter(rec => rec.id !== id));
      toast.success('Recado removido');
    } catch {
      toast.error('Erro ao remover recado');
    }
  }

  return (
    <Card className="border-2 border-amber-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-700 text-base">
            <MessageSquare className="h-5 w-5" />
            {titulo}
            {naoLidos > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {naoLidos}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={loadRecados} title="Atualizar">
              <RefreshCw className={`h-4 w-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {podeEnviar && (
              <Button size="sm" onClick={() => setMostrarForm(!mostrarForm)}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                <Plus className="h-3 w-3 mr-1" /> Novo Recado
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Formulário de criação (coordenadora) */}
        {podeEnviar && mostrarForm && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-700">Novo Recado para Professoras</p>

            <div>
              <Label className="text-xs">Título *</Label>
              <Input placeholder="Ex: Reunião pedagógica amanhã!" value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>

            <div>
              <Label className="text-xs">Mensagem *</Label>
              <Textarea placeholder="Escreva o recado completo aqui..." rows={3} value={form.mensagem}
                onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Destinatário</Label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.destinatario}
                  onChange={e => setForm(f => ({ ...f, destinatario: e.target.value }))}>
                  <option value="TODAS_PROFESSORAS">Todas as Professoras</option>
                  {turmas.length > 0 && <option value="TURMA_ESPECIFICA">Turma Específica</option>}
                </select>
              </div>
              {form.destinatario === 'TURMA_ESPECIFICA' && turmas.length > 0 && (
                <div>
                  <Label className="text-xs">Turma</Label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.classroomId}
                    onChange={e => setForm(f => ({ ...f, classroomId: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {turmas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="importante" checked={form.importante}
                onChange={e => setForm(f => ({ ...f, importante: e.target.checked }))} />
              <label htmlFor="importante" className="text-sm text-amber-700 font-medium cursor-pointer">
                Marcar como importante (destaque vermelho)
              </label>
            </div>

            <div className="flex gap-2">
              <Button onClick={enviarRecado} disabled={saving} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                {saving ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : null}
                Enviar Recado
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMostrarForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Lista de recados */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-5 w-5 text-amber-400 animate-spin" />
          </div>
        )}

        {!loading && recados.length === 0 && (
          <div className="text-center py-4">
            <BellOff className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum recado no momento</p>
          </div>
        )}

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {recados.map(recado => (
            <div
              key={recado.id}
              className={`rounded-xl p-3 border transition-all ${
                recado.importante
                  ? 'bg-red-50 border-red-200'
                  : recado.lido
                  ? 'bg-gray-50 border-gray-100 opacity-75'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {recado.importante && <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />}
                    <p className={`text-sm font-semibold truncate ${recado.importante ? 'text-red-700' : 'text-amber-800'}`}>
                      {recado.titulo}
                    </p>
                    {!recado.lido && (
                      <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{recado.mensagem}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(recado.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!recado.lido && (
                    <button onClick={() => marcarLido(recado.id)} title="Marcar como lido"
                      className="p-1 rounded hover:bg-amber-100 text-amber-600">
                      <CheckCheck className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {podeEnviar && (
                    <button onClick={() => deletarRecado(recado.id)} title="Remover"
                      className="p-1 rounded hover:bg-red-100 text-red-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
