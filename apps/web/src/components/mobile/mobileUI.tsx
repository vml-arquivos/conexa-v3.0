/**
 * mobileUI.tsx — Componentes compartilhados do PWA mobile
 *
 * - MobileHeader: título + subtítulo da página
 * - MobileField: label + input padronizado
 * - MobileTextarea: textarea responsivo
 * - MobileSelect: select nativo estilizado
 * - MobileSaveBar: botão fixo na parte inferior
 * - PhotoCapture: abre câmera ou galeria, retorna base64
 * - ChipGroup: grupo de chips de seleção
 */

import React, { useRef, useState } from 'react';
import { Camera, Image, X, Loader2, Send } from 'lucide-react';

// ─── Tokens mobile ────────────────────────────────────────────────────────────
export const M = {
  radius:  { sm: 10, md: 12, lg: 14, xl: 16, full: 9999 },
  space:   { xs: 6, sm: 10, md: 14, lg: 18, xl: 24 },
  font:    { xs: 11, sm: 12, md: 13, base: 15, lg: 17, xl: 20 },
  color: {
    brand:      '#4f46e5',
    brandLight: '#eef2ff',
    brandText:  '#4338ca',
    surface:    '#ffffff',
    page:       '#f8fafc',
    border:     '#e2e8f0',
    borderSoft: '#f1f5f9',
    text:       '#0f172a',
    textSoft:   '#475569',
    textMuted:  '#94a3b8',
    success:    '#10b981',
    successBg:  '#f0fdf4',
    warning:    '#f59e0b',
    warningBg:  '#fffbeb',
    error:      '#ef4444',
    errorBg:    '#fef2f2',
  },
};

// ─── Header da página ─────────────────────────────────────────────────────────
export function MobilePageHeader({
  title,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  color?: string;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h1 style={{
        fontSize: M.font.lg, fontWeight: 600, margin: '0 0 2px',
        color: M.color.text,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {Icon && <Icon size={20} color={color ?? M.color.brand} />}
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: M.font.sm, color: M.color.textMuted, margin: 0 }}>{subtitle}</p>
      )}
    </div>
  );
}

// ─── Label + campo ────────────────────────────────────────────────────────────
export function MobileField({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: M.font.sm, fontWeight: 600,
        color: M.color.textSoft, marginBottom: 6,
      }}>
        {label} {required && <span style={{ color: M.color.error }}>*</span>}
      </label>
      {children}
      {hint && (
        <p style={{ fontSize: M.font.xs, color: M.color.textMuted, margin: '4px 0 0' }}>{hint}</p>
      )}
    </div>
  );
}

// ─── Input nativo ─────────────────────────────────────────────────────────────
export const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '13px 14px', fontSize: 15,
  border: `0.5px solid ${M.color.border}`,
  borderRadius: M.radius.md,
  background: M.color.surface,
  color: M.color.text,
  outline: 'none',
  WebkitAppearance: 'none',
  fontFamily: 'inherit',
};

// ─── Textarea responsivo ──────────────────────────────────────────────────────
export function MobileTextarea({
  value, onChange, placeholder, rows = 4, maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        style={{
          ...inputStyle,
          resize: 'vertical',
          lineHeight: 1.6,
        }}
      />
      {maxLength && (
        <p style={{ fontSize: M.font.xs, color: M.color.textMuted, margin: '3px 0 0', textAlign: 'right' }}>
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}

// ─── Select nativo ────────────────────────────────────────────────────────────
export function MobileSelect({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputStyle,
          paddingRight: 40,
          appearance: 'none',
          WebkitAppearance: 'none',
          cursor: 'pointer',
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <svg viewBox="0 0 20 20" fill="none" stroke={M.color.textMuted} strokeWidth="1.5"
        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, pointerEvents: 'none' }}>
        <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── Chips de seleção ─────────────────────────────────────────────────────────
export function ChipGroup({
  options, selected, onToggle, multi = false, color,
}: {
  options: { id: string; label: string; Icon?: React.ElementType }[];
  selected: string | string[];
  onToggle: (id: string) => void;
  multi?: boolean;
  color?: string;
}) {
  const cor = color ?? M.color.brand;
  const isSelected = (id: string) =>
    multi ? (selected as string[]).includes(id) : selected === id;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const active = isSelected(o.id);
        const Icon = o.Icon;
        return (
          <button
            key={o.id}
            onClick={() => onToggle(o.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 13px', borderRadius: M.radius.full,
              border: `0.5px solid ${active ? cor : M.color.border}`,
              background: active ? `${cor}14` : M.color.surface,
              color: active ? cor : M.color.textSoft,
              fontSize: M.font.md, fontWeight: active ? 600 : 400,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              transition: 'all 0.12s', flexShrink: 0, fontFamily: 'inherit',
            }}
          >
            {Icon && <Icon size={13} strokeWidth={active ? 2.5 : 1.8} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Barra de salvar fixa ─────────────────────────────────────────────────────
export function MobileSaveBar({
  label = 'Salvar',
  labelSaving = 'Salvando...',
  labelDone,
  onClick,
  disabled,
  saving,
  saved,
  color,
  isOnline,
}: {
  label?: string;
  labelSaving?: string;
  labelDone?: string;
  onClick: () => void;
  disabled?: boolean;
  saving?: boolean;
  saved?: boolean;
  color?: string;
  isOnline?: boolean;
}) {
  const cor = saved ? M.color.success : color ?? M.color.brand;
  const text = saved && labelDone ? labelDone
    : saving ? labelSaving
    : isOnline === false ? `${label} offline`
    : label;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0, right: 0,
      padding: '12px 16px',
      paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      background: M.color.surface,
      borderTop: `0.5px solid ${M.color.borderSoft}`,
      boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
      zIndex: 10,
    }}>
      <button
        onClick={onClick}
        disabled={disabled || saving}
        style={{
          width: '100%', padding: 15, borderRadius: M.radius.lg, border: 'none',
          background: cor, color: '#fff',
          fontSize: M.font.base, fontWeight: 600,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: (disabled || saving) ? 0.6 : 1,
          transition: 'background 0.2s, opacity 0.2s',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {saving
          ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
          : saved ? '✓' : <Send size={16} />}
        {text}
      </button>
    </div>
  );
}

// ─── Captura de foto (câmera ou galeria) ──────────────────────────────────────

export interface CapturedPhoto {
  dataUrl: string;   // base64 completo
  base64: string;    // só os dados (sem prefixo)
  mimeType: string;
  fileName: string;
}

export function PhotoCapture({
  photos,
  onAdd,
  onRemove,
  maxPhotos = 3,
  label = 'Foto',
}: {
  photos: CapturedPhoto[];
  onAdd: (photo: CapturedPhoto) => void;
  onRemove: (index: number) => void;
  maxPhotos?: number;
  label?: string;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [showOptions, setShowOptions] = useState(false);

  function processFile(file: File): Promise<CapturedPhoto> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const [prefix, base64] = dataUrl.split(',');
        const mimeType = prefix.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
        resolve({
          dataUrl,
          base64,
          mimeType,
          fileName: file.name || `foto-${Date.now()}.jpg`,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (photos.length >= maxPhotos) break;
      const photo = await processFile(file);
      onAdd(photo);
    }
    e.target.value = '';
    setShowOptions(false);
  }

  return (
    <div>
      {/* Fotos tiradas */}
      {photos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ position: 'relative', width: 80, height: 80 }}>
              <img
                src={p.dataUrl}
                alt={`foto ${i + 1}`}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: M.radius.md, border: `0.5px solid ${M.color.border}` }}
              />
              <button
                onClick={() => onRemove(i)}
                style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 22, height: 22, borderRadius: '50%',
                  background: M.color.error, border: '2px solid #fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0,
                }}
              >
                <X size={11} color="#fff" strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botões de captura */}
      {photos.length < maxPhotos && (
        <>
          {showOptions ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Câmera */}
              <label style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '12px', borderRadius: M.radius.md, cursor: 'pointer',
                border: `0.5px solid ${M.color.brand}`,
                background: M.color.brandLight, color: M.color.brandText,
                fontSize: M.font.md, fontWeight: 500,
              }}>
                <Camera size={18} />
                Câmera
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>

              {/* Galeria */}
              <label style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '12px', borderRadius: M.radius.md, cursor: 'pointer',
                border: `0.5px solid ${M.color.border}`,
                background: M.color.surface, color: M.color.textSoft,
                fontSize: M.font.md, fontWeight: 500,
              }}>
                <Image size={18} />
                Galeria
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>

              <button onClick={() => setShowOptions(false)} style={{
                width: 46, borderRadius: M.radius.md, border: `0.5px solid ${M.color.border}`,
                background: M.color.surface, color: M.color.textMuted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowOptions(true)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 14px', borderRadius: M.radius.md, cursor: 'pointer',
              border: `0.5px dashed ${M.color.border}`,
              background: M.color.page, color: M.color.textSoft,
              fontSize: M.font.md, width: '100%', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <Camera size={18} color={M.color.brand} />
              Adicionar {label} ({photos.length}/{maxPhotos})
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Card de aluno (chamada) ──────────────────────────────────────────────────
export function AlunoCard({
  nome, iniciais, status, alerta, onClick,
}: {
  nome: string;
  iniciais: string;
  status: 'P' | 'F' | null;
  alerta?: string;
  onClick: () => void;
}) {
  const cor = status === 'P' ? M.color.success : status === 'F' ? M.color.error : M.color.textMuted;
  const bg  = status === 'P' ? M.color.successBg : status === 'F' ? M.color.errorBg : M.color.surface;

  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: M.radius.lg,
      border: `0.5px solid ${status ? cor + '60' : M.color.borderSoft}`,
      background: bg, cursor: 'pointer', textAlign: 'left',
      WebkitTapHighlightColor: 'transparent',
      transition: 'all 0.12s', width: '100%',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
        background: status ? `${cor}20` : M.color.page,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: status ? 18 : 14, fontWeight: 600,
        color: status ? cor : M.color.textMuted,
      }}>
        {status === 'P' ? '✓' : status === 'F' ? '✗' : iniciais}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: M.font.base, fontWeight: 500, margin: 0, color: M.color.text, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {nome}
        </p>
        {alerta && <p style={{ fontSize: M.font.xs, color: M.color.warning, margin: 0 }}>⚠ {alerta}</p>}
      </div>
      <span style={{
        fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: M.radius.full, flexShrink: 0,
        background: status ? `${cor}20` : M.color.page,
        color: status ? cor : M.color.textMuted,
        border: `0.5px solid ${status ? `${cor}40` : M.color.borderSoft}`,
      }}>
        {status === 'P' ? 'Presente' : status === 'F' ? 'Falta' : '—'}
      </span>
    </button>
  );
}
