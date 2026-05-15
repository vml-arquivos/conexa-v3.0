/**
 * ProfileAvatarUploader
 *
 * Exibe o avatar do usuário com iniciais como fallback premium.
 * Não faz upload real (o modelo User não tem campo photoUrl no banco).
 * Preparado para receber `onUpload` quando o endpoint existir.
 */
import { useRef } from 'react';
import { Camera } from 'lucide-react';

interface ProfileAvatarUploaderProps {
  name: string;
  email?: string;
  /** URL da foto real (opcional — sem suporte no backend atual) */
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Callback quando o usuário selecionar um arquivo (para uso futuro) */
  onUpload?: (file: File) => void;
  /** Se false, oculta o botão de câmera */
  editable?: boolean;
}

/** Gera iniciais a partir do nome completo */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Gera uma cor de fundo determinística a partir do nome */
function getAvatarColor(name: string): string {
  const colors = [
    'from-brand-600 to-brand-800',
    'from-violet-500 to-purple-700',
    'from-emerald-500 to-teal-700',
    'from-rose-500 to-pink-700',
    'from-amber-500 to-orange-700',
    'from-sky-500 to-blue-700',
    'from-indigo-500 to-indigo-700',
    'from-fuchsia-500 to-pink-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const SIZE_MAP = {
  sm: { container: 'w-12 h-12', text: 'text-base', camera: 'w-5 h-5', icon: 'h-2.5 w-2.5' },
  md: { container: 'w-20 h-20', text: 'text-2xl', camera: 'w-7 h-7', icon: 'h-3.5 w-3.5' },
  lg: { container: 'w-28 h-28', text: 'text-4xl', camera: 'w-8 h-8', icon: 'h-4 w-4' },
};

export function ProfileAvatarUploader({
  name,
  email: _email,
  photoUrl,
  size = 'md',
  onUpload,
  editable = true,
}: ProfileAvatarUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const s = SIZE_MAP[size];
  const initials = getInitials(name || '?');
  const gradientColor = getAvatarColor(name || '');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (onUpload) onUpload(file);
    // Reset input para permitir re-seleção do mesmo arquivo
    e.target.value = '';
  }

  return (
    <div className="relative inline-block">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={`Foto de ${name}`}
          className={`${s.container} rounded-full object-cover ring-4 ring-white shadow-md`}
        />
      ) : (
        <div
          className={`${s.container} rounded-full bg-gradient-to-br ${gradientColor} flex items-center justify-center ring-4 ring-white shadow-md select-none`}
          aria-label={`Avatar de ${name}`}
        >
          <span className={`${s.text} font-bold text-white tracking-tight`}>
            {initials}
          </span>
        </div>
      )}

      {editable && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Alterar foto de perfil"
            className={`absolute bottom-0 right-0 ${s.camera} bg-brand-600 hover:bg-brand-700 rounded-full flex items-center justify-center text-white shadow-md transition-colors ring-2 ring-white`}
          >
            <Camera className={s.icon} />
          </button>
        </>
      )}
    </div>
  );
}
