import { useEffect, useMemo, useState } from 'react';
import { UserCircle } from 'lucide-react';

type ChildAvatarSource = {
  firstName?: string | null;
  lastName?: string | null;
  nome?: string | null;
  photoUrl?: string | null;
  fotoUrl?: string | null;
  photo_url?: string | null;
  photo?: string | null;
  foto?: string | null;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  profilePhotoUrl?: string | null;
  profile_photo_url?: string | null;
} | null | undefined;

function sanitizePhotoUrl(value?: string | null): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized || normalized === 'null' || normalized === 'undefined') return undefined;
  return normalized;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function getApiBaseUrl(): string | undefined {
  const envBase = sanitizePhotoUrl((import.meta as any)?.env?.VITE_API_URL);
  if (envBase) return stripTrailingSlash(envBase);

  if (typeof window !== 'undefined' && window.location?.origin) {
    return stripTrailingSlash(window.location.origin);
  }

  return undefined;
}

function normalizePhotoUrl(value?: string | null): string | undefined {
  const normalized = sanitizePhotoUrl(value);
  if (!normalized) return undefined;

  if (/^(https?:)?\/\//i.test(normalized) || normalized.startsWith('data:') || normalized.startsWith('blob:')) {
    return normalized.startsWith('//') ? `https:${normalized}` : normalized;
  }

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return normalized;

  if (normalized.startsWith('/')) {
    return `${baseUrl}${normalized}`;
  }

  return `${baseUrl}/${normalized.replace(/^\.\//, '')}`;
}

export function resolveChildPhotoUrl(child?: ChildAvatarSource): string | undefined {
  if (!child) return undefined;

  return normalizePhotoUrl(child.photoUrl)
    ?? normalizePhotoUrl(child.fotoUrl)
    ?? normalizePhotoUrl(child.photo_url)
    ?? normalizePhotoUrl(child.photo)
    ?? normalizePhotoUrl(child.foto)
    ?? normalizePhotoUrl(child.avatarUrl)
    ?? normalizePhotoUrl(child.avatar_url)
    ?? normalizePhotoUrl(child.imageUrl)
    ?? normalizePhotoUrl(child.image_url)
    ?? normalizePhotoUrl(child.profilePhotoUrl)
    ?? normalizePhotoUrl(child.profile_photo_url);
}

export function getChildDisplayName(child?: ChildAvatarSource): string {
  if (!child) return 'Criança';
  const nomeCompleto = child.nome?.trim();
  if (nomeCompleto) return nomeCompleto;

  const partes = [child.firstName?.trim(), child.lastName?.trim()].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : 'Criança';
}

export function getChildInitials(child?: ChildAvatarSource): string {
  const nome = getChildDisplayName(child);
  const partes = nome.split(/\s+/).filter(Boolean);
  const iniciais = partes.slice(0, 2).map((parte) => parte[0]?.toUpperCase() ?? '').join('');
  return iniciais || 'CR';
}

export function hasChildPhoto(child?: ChildAvatarSource): boolean {
  return Boolean(resolveChildPhotoUrl(child));
}

type ChildAvatarProps = {
  child?: ChildAvatarSource;
  alt?: string;
  sizeClassName?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  iconClassName?: string;
  initialsClassName?: string;
  showInitials?: boolean;
};

export function ChildAvatar({
  child,
  alt,
  sizeClassName = 'w-10 h-10',
  imageClassName = 'rounded-full object-cover',
  fallbackClassName = 'rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center',
  iconClassName = 'w-6 h-6 text-slate-400',
  initialsClassName = 'text-sm font-bold text-slate-600',
  showInitials = false,
}: ChildAvatarProps) {
  const src = useMemo(() => resolveChildPhotoUrl(child), [child]);
  const [imageError, setImageError] = useState(false);
  const label = alt ?? getChildDisplayName(child);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={label}
        loading="lazy"
        className={`${sizeClassName} ${imageClassName}`.trim()}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div className={`${sizeClassName} ${fallbackClassName}`.trim()} aria-label={label}>
      {showInitials ? (
        <span className={initialsClassName}>{getChildInitials(child)}</span>
      ) : (
        <UserCircle className={iconClassName} />
      )}
    </div>
  );
}
