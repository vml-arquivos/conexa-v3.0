import { useNavigate, useLocation } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Button } from '../components/ui/button';
import { Construction, ArrowLeft, Clock } from 'lucide-react';

const PAGE_LABELS: Record<string, string> = {
  '/app/chamada': 'Chamada Diária',
  '/app/rdx': 'Fotos da Turma (RDX)',
  '/app/plannings': 'Planejamentos',
  '/app/diary': 'Diário',
  '/app/matrices': 'Matrizes',
  '/app/reports': 'Relatórios',
};

export default function ComingSoonPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const label = PAGE_LABELS[location.pathname] || 'Esta funcionalidade';

  return (
    <PageShell title={label} subtitle="Em breve disponível">
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center">
          <Construction className="h-10 w-10 text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{label}</h2>
          <p className="text-gray-500 max-w-md">
            Esta funcionalidade está em desenvolvimento e será disponibilizada em breve.
            Acompanhe as atualizações do sistema.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
          <Clock className="h-4 w-4" />
          <span>Previsão: próxima versão do sistema</span>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>
    </PageShell>
  );
}
