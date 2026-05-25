import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Activity, BookOpen, Brain, Clock, Eye, RefreshCw } from 'lucide-react';

type ChildQuickActionKey = 'central' | 'painel' | 'timeline' | 'observacoes';

interface ChildQuickActionsProps {
  childId?: string | null;
  classroomId?: string | null;
  current?: ChildQuickActionKey;
  canCreateRdic?: boolean;
  rdicLabel?: string;
  onRefresh?: () => void;
  className?: string;
}

/**
 * Barra reutilizável de ações rápidas da criança.
 *
 * Mantém a navegação entre Central RDIC, Painel Analítico, Timeline e
 * Observações de Desenvolvimento consistente em todas as telas da criança.
 * É um componente somente de frontend: não muda contratos, banco ou RBAC.
 */
export function ChildQuickActions({
  childId,
  classroomId,
  current,
  canCreateRdic = false,
  rdicLabel = 'Criar/Editar RDIC',
  onRefresh,
  className = '',
}: ChildQuickActionsProps) {
  const navigate = useNavigate();
  const safeChildId = childId ?? '';
  const safeClassroomId = classroomId ?? '';

  const go = (path: string) => {
    if (!safeChildId) return;
    navigate(path);
  };

  const baseBtn = 'flex items-center gap-2 text-sm';
  const active = 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-50';
  const neutral = 'border-gray-200 text-gray-700 hover:bg-gray-50';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {onRefresh && (
        <Button variant="outline" onClick={onRefresh} className={`${baseBtn} ${neutral}`}>
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      )}

      <Button
        variant="outline"
        onClick={() => go(`/app/crianca/${safeChildId}/rdic-central`)}
        disabled={!safeChildId}
        className={`${baseBtn} ${current === 'central' ? active : neutral}`}
      >
        <Brain className="h-4 w-4" /> Central RDIC
      </Button>

      <Button
        variant="outline"
        onClick={() => go(`/app/crianca/${safeChildId}/painel-analitico`)}
        disabled={!safeChildId}
        className={`${baseBtn} ${current === 'painel' ? active : neutral}`}
      >
        <Activity className="h-4 w-4" /> Painel
      </Button>

      <Button
        variant="outline"
        onClick={() => go(`/app/crianca/${safeChildId}/timeline`)}
        disabled={!safeChildId}
        className={`${baseBtn} ${current === 'timeline' ? active : neutral}`}
      >
        <Clock className="h-4 w-4" /> Timeline
      </Button>

      <Button
        variant="outline"
        onClick={() => go(`/app/crianca/${safeChildId}/observacoes`)}
        disabled={!safeChildId}
        className={`${baseBtn} ${current === 'observacoes' ? active : neutral}`}
      >
        <Eye className="h-4 w-4" /> Observações
      </Button>

      {canCreateRdic && (
        <Button
          onClick={() => go(`/app/rdic-crianca?childId=${safeChildId}&classroomId=${safeClassroomId}`)}
          disabled={!safeChildId}
          className={`${baseBtn} bg-indigo-600 hover:bg-indigo-700 text-white`}
        >
          <BookOpen className="h-4 w-4" /> {rdicLabel}
        </Button>
      )}
    </div>
  );
}

export default ChildQuickActions;
