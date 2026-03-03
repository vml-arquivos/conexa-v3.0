import { AlertTriangle } from 'lucide-react';

interface Props {
  /** ID da criança (reservado para uso futuro, ex: deep-link ao prontuário) */
  childId?: string;
  /** String de alergias (ex: "Amendoim, Leite") ou null/undefined se não houver */
  allergies?: string | null;
  /** Condições médicas relevantes ou null/undefined se não houver */
  medicalConditions?: string | null;
  /** Compatibilidade legada: array de alergias */
  alergias?: string[];
  /** Compatibilidade legada: array de restrições de dieta */
  restricoesDieta?: string[];
}

export function AlergiaAlert({
  allergies,
  medicalConditions,
  alergias = [],
  restricoesDieta = [],
}: Props) {
  // Combina o novo formato (strings) com o legado (arrays)
  const items: string[] = [
    ...(allergies ? [allergies] : []),
    ...(medicalConditions ? [medicalConditions] : []),
    ...alergias,
    ...restricoesDieta,
  ].filter(Boolean);

  if (!items.length) return null;

  return (
    <div
      className="w-full bg-red-600 text-white px-4 py-3 flex items-center gap-3 rounded-xl mb-4 shadow-lg animate-pulse"
      role="alert"
      aria-live="assertive"
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
      <div>
        <span className="font-black text-sm uppercase tracking-wide">⚠️ ALERTA: </span>
        <span className="font-semibold text-sm">{items.join(' • ')}</span>
      </div>
    </div>
  );
}
