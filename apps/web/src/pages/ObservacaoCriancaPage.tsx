import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { LoadingState } from '../components/ui/LoadingState';
import http from '../api/http';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { ChildQuickActions } from '../components/children/ChildQuickActions';

/**
 * ObservacaoCriancaPage — tela de registro e listagem de observações de desenvolvimento
 *
 * Esta página foi concebida para professores e coordenadores registrarem
 * observações individuais de crianças em um formato estruturado. Ela
 * apresenta um formulário simples para criação de novas observações e uma
 * listagem das observações existentes para a criança. As ações aqui não
 * substituem o módulo avançado de desenvolvimento infantil (acesso
 * restrito à coordenação/psicologia), mas oferecem um ponto de entrada
 * rápido para registros cotidianos.
 */
export default function ObservacaoCriancaPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();

  // Estado do carregamento de dados iniciais
  const [carregando, setCarregando] = useState<boolean>(true);
  // Dados da criança
  const [child, setChild] = useState<any>(null);
  // Lista de observações existentes
  const [observacoes, setObservacoes] = useState<any[]>([]);
  // Estado de novo registro
  const [novaObs, setNovaObs] = useState({
    category: 'COMPORTAMENTO',
    behaviorDescription: '',
    developmentAlerts: '',
    recommendations: '',
    date: new Date().toISOString().slice(0, 10),
    // Campos detalhados por área de desenvolvimento — antes só existiam na
    // tela restrita à coordenação (DesenvolvimentoInfantilPage). O professor,
    // que acompanha a criança todos os dias, nunca tinha acesso a eles.
    // Todos opcionais: quem só quer um registro rápido continua podendo.
    socialInteraction: '',
    emotionalState: '',
    motorSkills: '',
    cognitiveSkills: '',
    languageSkills: '',
    sleepPattern: '',
    healthNotes: '',
    dietaryNotes: '',
    psychologicalNotes: '',
    interests: '',
    challenges: '',
    nextSteps: '',
  });
  const [mostrarDetalhamento, setMostrarDetalhamento] = useState(false);
  const [salvando, setSalvando] = useState<boolean>(false);

  // Lista de categorias disponíveis (simplificada)
  const CATEGORIAS = [
    { value: 'COMPORTAMENTO', label: 'Comportamento' },
    { value: 'SOCIAL', label: 'Social' },
    { value: 'EMOCIONAL', label: 'Emocional' },
    { value: 'COGNITIVO', label: 'Cognitivo' },
    { value: 'MOTOR', label: 'Motor' },
    { value: 'LINGUAGEM', label: 'Linguagem' },
    { value: 'APRENDIZAGEM', label: 'Aprendizagem' },
    { value: 'GERAL', label: 'Geral' },
    { value: 'PSICOLOGICO', label: 'Psicológico' },
    { value: 'ALERTA', label: 'Alerta de Desenvolvimento' },
  ];

  // Carrega dados da criança e suas observações quando a rota mudar
  useEffect(() => {
    async function carregar() {
      if (!childId) return;
      setCarregando(true);
      try {
        // Buscar dados da criança
        const childRes = await http.get(`/children/${childId}`);
        setChild(childRes.data ?? null);
      } catch {
        setChild(null);
      }
      try {
        // Buscar observações existentes
        const obsRes = await http.get('/development-observations', { params: { childId, limit: '200' } });
        const dados = Array.isArray(obsRes?.data)
          ? obsRes.data
          : Array.isArray(obsRes?.data?.data)
          ? obsRes.data.data
          : [];
        setObservacoes(dados);
      } catch {
        setObservacoes([]);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [childId]);

  // Manipula envio do formulário
  const salvarObs = async () => {
    if (!childId) return;
    if (!novaObs.behaviorDescription.trim()) {
      toast.error('Preencha a descrição do comportamento');
      return;
    }
    setSalvando(true);
    try {
      await http.post('/development-observations', {
        childId,
        category: novaObs.category,
        behaviorDescription: novaObs.behaviorDescription,
        developmentAlerts: novaObs.developmentAlerts || undefined,
        recommendations: novaObs.recommendations || undefined,
        date: novaObs.date,
        // Detalhamento por área — enviado apenas quando preenchido, para não
        // sobrescrever registros existentes com strings vazias.
        socialInteraction: novaObs.socialInteraction || undefined,
        emotionalState: novaObs.emotionalState || undefined,
        motorSkills: novaObs.motorSkills || undefined,
        cognitiveSkills: novaObs.cognitiveSkills || undefined,
        languageSkills: novaObs.languageSkills || undefined,
        sleepPattern: novaObs.sleepPattern || undefined,
        healthNotes: novaObs.healthNotes || undefined,
        dietaryNotes: novaObs.dietaryNotes || undefined,
        psychologicalNotes: novaObs.psychologicalNotes || undefined,
        interests: novaObs.interests || undefined,
        challenges: novaObs.challenges || undefined,
        nextSteps: novaObs.nextSteps || undefined,
      });
      toast.success('Observação registrada com sucesso');
      // Limpar formulário e recarregar lista
      setNovaObs({
        category: 'COMPORTAMENTO',
        behaviorDescription: '',
        developmentAlerts: '',
        recommendations: '',
        date: new Date().toISOString().slice(0, 10),
        socialInteraction: '',
        emotionalState: '',
        motorSkills: '',
        cognitiveSkills: '',
        languageSkills: '',
        sleepPattern: '',
        healthNotes: '',
        dietaryNotes: '',
        psychologicalNotes: '',
        interests: '',
        challenges: '',
        nextSteps: '',
      });
      setMostrarDetalhamento(false);
      try {
        const obsRes = await http.get('/development-observations', { params: { childId, limit: '200' } });
        const dados = Array.isArray(obsRes?.data)
          ? obsRes.data
          : Array.isArray(obsRes?.data?.data)
          ? obsRes.data.data
          : [];
        setObservacoes(dados);
      } catch {
        // ignora falha no recarregamento
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao registrar observação');
    } finally {
      setSalvando(false);
    }
  };

  // Formata data ISO para padrão brasileiro
  function formatarData(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
      return iso;
    }
  }

  return (
    <PageShell>
      {/* Cabeçalho com botão de retorno */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="px-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <h1 className="text-lg font-semibold text-gray-800">
          Observações de Desenvolvimento
        </h1>
      </div>

      {child && (
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {child.firstName} {child.lastName}
          </h2>
          {child.dateOfBirth && (
            <p className="text-sm text-gray-500">
              Nascido(a) em {formatarData(child.dateOfBirth)}
            </p>
          )}
        </div>
      )}

      <ChildQuickActions
        childId={childId}
        classroomId={child?.turma?.id ?? child?.classroom?.id ?? child?.classroomId ?? child?.activeEnrollment?.classroomId}
        current="observacoes"
        className="mb-4"
      />

      {/* Formulário de nova observação */}
      <Card className="mb-6">
        <CardContent className="space-y-4 p-4">
          <h3 className="text-md font-semibold text-gray-800">
            Registrar nova observação
          </h3>
          {/* Categoria */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Categoria
            </label>
            <select
              value={novaObs.category}
              onChange={(e) => setNovaObs({ ...novaObs, category: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {/* Data */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Data da observação
            </label>
            <Input
              type="date"
              value={novaObs.date}
              onChange={(e) => setNovaObs({ ...novaObs, date: e.target.value })}
            />
          </div>
          {/* Descrição */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Descrição do comportamento / observação *
            </label>
            <textarea
              value={novaObs.behaviorDescription}
              onChange={(e) => setNovaObs({ ...novaObs, behaviorDescription: e.target.value })}
              className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Descreva o comportamento observado, circunstâncias e contextos"
            />
          </div>
          {/* Alertas */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Alertas de Desenvolvimento (opcional)
            </label>
            <textarea
              value={novaObs.developmentAlerts}
              onChange={(e) => setNovaObs({ ...novaObs, developmentAlerts: e.target.value })}
              className="w-full min-h-[60px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Indique sinais de atenção ou preocupações"
            />
          </div>
          {/* Recomendações */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Recomendações (opcional)
            </label>
            <textarea
              value={novaObs.recommendations}
              onChange={(e) => setNovaObs({ ...novaObs, recommendations: e.target.value })}
              className="w-full min-h-[60px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Sugestões de acompanhamento, atividades ou estratégias"
            />
          </div>

          {/* Detalhamento por área de desenvolvimento — opcional, expansível.
              Antes só a coordenação tinha acesso a esses campos. O professor,
              que vê a criança todos os dias, agora pode registrar aqui mesmo,
              sem precisar de uma tela separada. */}
          <div className="border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => setMostrarDetalhamento((v) => !v)}
              className="text-sm font-medium text-purple-700 hover:text-purple-800 flex items-center gap-1"
            >
              {mostrarDetalhamento ? '− Ocultar' : '+ Adicionar'} detalhamento por área de desenvolvimento
            </button>
            <p className="text-xs text-gray-400 mt-1">
              Opcional. Use quando quiser registrar algo específico sobre motricidade, linguagem, sono, saúde ou comportamento social/emocional.
            </p>

            {mostrarDetalhamento && (
              <div className="mt-3 space-y-4">
                {/* Grupo: Desempenho */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Desempenho</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Habilidades motoras</label>
                    <textarea value={novaObs.motorSkills} onChange={(e) => setNovaObs({ ...novaObs, motorSkills: e.target.value })}
                      className="w-full min-h-[50px] rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Coordenação, equilíbrio, movimentos finos e grossos..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Habilidades cognitivas</label>
                    <textarea value={novaObs.cognitiveSkills} onChange={(e) => setNovaObs({ ...novaObs, cognitiveSkills: e.target.value })}
                      className="w-full min-h-[50px] rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Resolução de problemas, atenção, memória..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Habilidades de linguagem</label>
                    <textarea value={novaObs.languageSkills} onChange={(e) => setNovaObs({ ...novaObs, languageSkills: e.target.value })}
                      className="w-full min-h-[50px] rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Vocabulário, comunicação, compreensão..." />
                  </div>
                </div>

                {/* Grupo: Comportamento e bem-estar */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Comportamento e bem-estar</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Interação social</label>
                    <textarea value={novaObs.socialInteraction} onChange={(e) => setNovaObs({ ...novaObs, socialInteraction: e.target.value })}
                      className="w-full min-h-[50px] rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Relação com colegas, brincadeiras em grupo..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Estado emocional</label>
                    <textarea value={novaObs.emotionalState} onChange={(e) => setNovaObs({ ...novaObs, emotionalState: e.target.value })}
                      className="w-full min-h-[50px] rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Humor, reações emocionais ao longo do dia..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Padrão de sono</label>
                    <textarea value={novaObs.sleepPattern} onChange={(e) => setNovaObs({ ...novaObs, sleepPattern: e.target.value })}
                      className="w-full min-h-[50px] rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Qualidade e duração do sono na rotina..." />
                  </div>
                </div>

                {/* Grupo: Saúde — sensível, revisado pela coordenação */}
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Saúde e alimentação (conteúdo sensível)</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notas de saúde</label>
                    <textarea value={novaObs.healthNotes} onChange={(e) => setNovaObs({ ...novaObs, healthNotes: e.target.value })}
                      className="w-full min-h-[50px] rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Sintomas, queixas, situações de saúde observadas..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notas de alimentação</label>
                    <textarea value={novaObs.dietaryNotes} onChange={(e) => setNovaObs({ ...novaObs, dietaryNotes: e.target.value })}
                      className="w-full min-h-[50px] rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Aceitação alimentar, recusas, observações sobre refeições..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notas psicológicas</label>
                    <textarea value={novaObs.psychologicalNotes} onChange={(e) => setNovaObs({ ...novaObs, psychologicalNotes: e.target.value })}
                      className="w-full min-h-[50px] rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Encaminhar para psicologia/coordenação quando necessário..." />
                  </div>
                </div>

                {/* Grupo: Perfil */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Perfil da criança</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Interesses</label>
                    <textarea value={novaObs.interests} onChange={(e) => setNovaObs({ ...novaObs, interests: e.target.value })}
                      className="w-full min-h-[50px] rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="O que a criança demonstra gostar, temas de interesse..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Desafios</label>
                    <textarea value={novaObs.challenges} onChange={(e) => setNovaObs({ ...novaObs, challenges: e.target.value })}
                      className="w-full min-h-[50px] rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Dificuldades atuais a serem trabalhadas..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Próximos passos</label>
                    <textarea value={novaObs.nextSteps} onChange={(e) => setNovaObs({ ...novaObs, nextSteps: e.target.value })}
                      className="w-full min-h-[50px] rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="O que planejar para o próximo período..." />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={salvarObs} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar Observação'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Listagem de observações */}
      <div className="mb-3">
        <h3 className="text-md font-semibold text-gray-800 mb-2">
          Observações registradas
        </h3>
        {carregando ? (
          <LoadingState />
        ) : observacoes.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma observação registrada.</p>
        ) : (
          <div className="space-y-2">
            {observacoes.map((obs) => {
              const cat = CATEGORIAS.find((c) => c.value === obs.category);
              return (
                <div
                  key={obs.id}
                  className="bg-white border border-gray-200 rounded-xl p-3 hover:border-purple-200 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                      {cat?.label ?? obs.category}
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatarData(obs.date ?? obs.createdAt)}
                    </span>
                  </div>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {obs.behaviorDescription || obs.description}
                    </p>
                    {obs.developmentAlerts && (
                      <p className="text-xs text-red-600 mt-0.5">
                        Alerta: {obs.developmentAlerts}
                      </p>
                    )}
                    {obs.recommendations && (
                      <p className="text-xs text-gray-600 mt-0.5">
                        Recomendações: {obs.recommendations}
                      </p>
                    )}
                    {/* Campos de detalhamento — exibidos só quando preenchidos.
                        nextSteps pode conter um marcador interno de anexo
                        ([ANEXO_ATIVIDADE] {...}); removemos antes de exibir
                        e mostramos o nome do arquivo via campo já serializado. */}
                    {[
                      { campo: obs.motorSkills, label: 'Motor' },
                      { campo: obs.cognitiveSkills, label: 'Cognitivo' },
                      { campo: obs.languageSkills, label: 'Linguagem' },
                      { campo: obs.socialInteraction, label: 'Social' },
                      { campo: obs.emotionalState, label: 'Emocional' },
                      { campo: obs.sleepPattern, label: 'Sono' },
                      { campo: obs.healthNotes, label: 'Saúde' },
                      { campo: obs.dietaryNotes, label: 'Alimentação' },
                      { campo: obs.psychologicalNotes, label: 'Psicológico' },
                      { campo: obs.interests, label: 'Interesses' },
                      { campo: obs.challenges, label: 'Desafios' },
                      {
                        campo: (obs.nextSteps as string | undefined)
                          ?.split('\n')
                          .filter((linha: string) => !linha.trim().startsWith('[ANEXO_ATIVIDADE]'))
                          .join('\n')
                          .trim(),
                        label: 'Próximos passos',
                      },
                    ].filter((item) => item.campo).map((item) => (
                      <p key={item.label} className="text-xs text-gray-500 mt-0.5">
                        <span className="font-medium text-gray-600">{item.label}:</span> {item.campo}
                      </p>
                    ))}
                    {obs.atividadeArquivoNome && (
                      <p className="text-xs text-indigo-600 mt-0.5">
                        Anexo: {obs.atividadeArquivoNome}
                      </p>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}