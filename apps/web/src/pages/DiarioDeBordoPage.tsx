import { useState, useEffect } from 'react';
import { useAutoSave } from '../hooks/useAutoSave';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { PageShell } from '../components/ui/PageShell';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import { BookOpen, Save } from 'lucide-react';
import http from '../api/http';

interface Aluno {
  id: string;
  nome: string;
  photoUrl?: string;
}

interface DiarioForm {
  alunoId: string;
  atividade: string;
  observacoes: string;
  alimentacao: string;
  sono: string;
  higiene: string;
}

const FORM_VAZIO: DiarioForm = {
  alunoId: '',
  atividade: '',
  observacoes: '',
  alimentacao: '',
  sono: '',
  higiene: '',
};

export default function DiarioDeBordoPage() {
  const [loading, setLoading] = useState(true);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [form, setForm] = useState<DiarioForm>(FORM_VAZIO);

  // ─── Auto-save no localStorage ────────────────────────────────────────────
  const { hasDraft, clearDraft, lastSaved } = useAutoSave({
    key: 'diario-bordo-rascunho',
    data: form,
    enabled: !loading,
    onRestore: (saved) => {
      setForm(saved as DiarioForm);
      toast.info('Rascunho do Diário de Bordo recuperado automaticamente.');
    },
  });

  useEffect(() => {
    loadAlunos();
  }, []);

  async function loadAlunos() {
    try {
      setLoading(true);
      const response = await http.get('/teachers/dashboard');
      const data = response.data;
      if (data.hasClassroom && data.alunos) {
        setAlunos(data.alunos);
        if (data.alunos.length > 0) {
          setForm(prev => ({ ...prev, alunoId: prev.alunoId || data.alunos[0].id }));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar alunos:', err);
      toast.error('Erro ao carregar lista de alunos');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.alunoId) { toast.error('Selecione um aluno'); return; }
    if (!form.atividade) { toast.error('Descreva a atividade realizada'); return; }
    try {
      await http.post('/diary-event', {
        childId: form.alunoId,
        date: new Date().toISOString(),
        activities: form.atividade,
        observations: form.observacoes,
        microgestures: {
          alimentacao: form.alimentacao,
          sono: form.sono ? parseInt(form.sono) : null,
          higiene: form.higiene,
        },
      });
      toast.success('Registro salvo com sucesso!');
      clearDraft();
      setForm({ ...FORM_VAZIO, alunoId: alunos[0]?.id || '' });
    } catch (err) {
      console.error('Erro ao salvar:', err);
      const message = err instanceof Error ? err.message : 'Erro ao salvar registro';
      toast.error(message);
    }
  }

  if (loading) {
    return (
      <PageShell title="Diário de Bordo">
        <LoadingState message="Carregando..." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Diário de Bordo"
      subtitle="Registre as atividades e observações do dia"
    >
      {/* Banner de auto-save */}
      {hasDraft && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
          <span className="text-amber-800">
            💾 Rascunho salvo automaticamente
            {lastSaved && ` às ${lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
          </span>
          <button onClick={clearDraft} className="text-xs text-amber-600 underline hover:text-amber-800">Descartar rascunho</button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Novo Registro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seleção de Aluno */}
            <div className="space-y-2">
              <Label htmlFor="aluno">Aluno *</Label>
              <select
                id="aluno"
                className="w-full p-2 border rounded-md"
                value={form.alunoId}
                onChange={(e) => setForm({ ...form, alunoId: e.target.value })}
                required
              >
                <option value="">Selecione um aluno</option>
                {alunos.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>
                ))}
              </select>
            </div>

            {/* Atividade Realizada */}
            <div className="space-y-2">
              <Label htmlFor="atividade">Atividade Realizada *</Label>
              <Textarea
                id="atividade"
                placeholder="Descreva a atividade realizada com o aluno..."
                value={form.atividade}
                onChange={(e) => setForm({ ...form, atividade: e.target.value })}
                rows={4}
                required
              />
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações sobre o Desenvolvimento</Label>
              <Textarea
                id="observacoes"
                placeholder="Como o aluno reagiu? O que chamou atenção?"
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Microgestos */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Cuidados e Rotina</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alimentacao">Alimentação</Label>
                  <select
                    id="alimentacao"
                    className="w-full p-2 border rounded-md"
                    value={form.alimentacao}
                    onChange={(e) => setForm({ ...form, alimentacao: e.target.value })}
                  >
                    <option value="">Não registrado</option>
                    <option value="ACEITOU_BEM">Aceitou bem</option>
                    <option value="ACEITOU_PARCIAL">Aceitou parcialmente</option>
                    <option value="RECUSOU">Recusou</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sono">Sono (minutos)</Label>
                  <Input
                    id="sono"
                    type="number"
                    placeholder="Ex: 60"
                    value={form.sono}
                    onChange={(e) => setForm({ ...form, sono: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="higiene">Troca de Fralda</Label>
                  <select
                    id="higiene"
                    className="w-full p-2 border rounded-md"
                    value={form.higiene}
                    onChange={(e) => setForm({ ...form, higiene: e.target.value })}
                  >
                    <option value="">Não registrado</option>
                    <option value="LIMPA">Limpa</option>
                    <option value="XIXI">Xixi</option>
                    <option value="COCO">Cocô</option>
                    <option value="AMBOS">Ambos</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Salvar Registro
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { clearDraft(); setForm({ ...FORM_VAZIO, alunoId: alunos[0]?.id || '' }); }}
              >
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Lista de Registros Recentes */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Registros de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum registro ainda hoje</p>
            <p className="text-sm">Comece registrando as atividades acima</p>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
