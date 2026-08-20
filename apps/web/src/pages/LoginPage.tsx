import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { getRedirectPathByRoles } from '../hooks/useRedirectByRole';
import { getErrorMessage } from '../utils/errorMessage';
import { getAccessToken } from '../api/tokenStorage';
import { Eye, EyeOff, BookOpen, Sparkles, Smartphone, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
      title={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
      className="absolute right-5 top-5 z-20 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-brand)] shadow-ds-sm transition hover:border-brand-400 hover:bg-[var(--surface-brand)]"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

// Detecta se o app está rodando como PWA instalado
function isPWAMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    if (e && typeof (e as React.FormEvent).preventDefault === 'function') {
      (e as React.FormEvent).preventDefault();
    }
    setError('');
    setLoading(true);
    try {
      // FIX P0.1: login() retorna Promise<void> — após o await o token já está
      // no localStorage. Decodificamos o JWT para obter roles sem depender do
      // state do React (que só atualiza no próximo ciclo de render).
      await login(email, password);
      let redirectPath = '/app/dashboard';
      try {
        const token = getAccessToken();
        if (token) {
          const parts = token.split('.');
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
            roles?: Array<{ level?: string; type?: string }>;
          };
          const roles = payload?.roles ?? [];
          const levels = roles.map((r) => r.level ?? '').filter(Boolean);
          const types  = roles.map((r) => r.type  ?? '').filter(Boolean);
          redirectPath = getRedirectPathByRoles(levels, types);
        }
      } catch { /* fallback para /app/dashboard */ }
      navigate(redirectPath);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'E-mail ou senha incorretos. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  // ── Login PWA: tela limpa para celular ─────────────────────────────────
  if (isPWAMode()) {
    return (
      <div className="relative" style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        background: 'var(--surface-page)', color: 'var(--text-primary)',
        fontFamily: 'var(--font-body)',
        padding: '0 24px',
        paddingTop: 'max(48px, env(safe-area-inset-top))',
        paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        justifyContent: 'space-between',
      }}>
        <ThemeToggle />

        {/* Topo: logo e título */}
        <div style={{ textAlign: 'center', color: 'var(--text-primary)' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, background: 'var(--surface-brand)',
            backdropFilter: 'blur(8px)', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--border-brand)',
          }}>
            <img
              src="/branding/cocris/logo-cocris.png"
              alt="COCRIS"
              style={{ width: 48, height: 48, objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
              }}
            />
            <span style={{ display: 'none', fontSize: 28, fontWeight: 800, color: 'var(--text-brand)' }}>C</span>
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, letterSpacing: -0.5 }}>
            COCRIS Pedagógico
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            Gestão de educação infantil
          </p>
        </div>

        {/* Formulário */}
        <div style={{
          background: 'var(--surface-card)', borderRadius: 24, padding: 24,
          border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)',
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 500, color: 'var(--text-primary)' }}>
            Entrar
          </h2>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 12, marginBottom: 16,
              background: 'var(--error-bg)', border: '0.5px solid var(--error-border)',
              fontSize: 13, color: 'var(--error)',
            }}>
              {error}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoCapitalize="none"
              autoCorrect="off"
              style={{
                width: '100%', padding: '13px 14px', borderRadius: 12, boxSizing: 'border-box',
                border: '0.5px solid var(--border-default)', background: 'var(--surface-inset)',
                fontSize: 16, color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>

          {/* Senha */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e as any)}
                style={{
                  width: '100%', padding: '13px 44px 13px 14px', borderRadius: 12, boxSizing: 'border-box',
                  border: '0.5px solid var(--border-default)', background: 'var(--surface-inset)',
                  fontSize: 16, color: 'var(--text-primary)', outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Botão entrar */}
          <button
            onClick={handleSubmit as any}
            disabled={loading || !email || !password}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: loading ? 'var(--brand-400)' : 'var(--brand-600)',
              color: 'var(--text-inverse)', fontSize: 16, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: (!email || !password) ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 18, height: 18, border: '2px solid color-mix(in srgb, var(--text-inverse) 30%, transparent)', borderTopColor: 'var(--text-inverse)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Entrando...
              </>
            ) : 'Entrar'}
          </button>
        </div>

        {/* Rodapé */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Smartphone size={12} /> App instalado
          </p>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex bg-[var(--surface-page)] text-[var(--text-primary)]">
      <ThemeToggle />
      {/* Painel esquerdo — identidade visual */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center border-r border-[var(--border-default)] bg-[var(--surface-card)] p-12 text-[var(--text-primary)] relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, var(--brand-400), transparent)', transform: 'translate(-30%, -30%)' }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, var(--brand-300), transparent)', transform: 'translate(30%, 30%)' }} />

        <div className="relative z-10 max-w-md text-center">
          {/* Logo desktop — COCRIS institucional */}
          <div className="flex items-center justify-center mb-8">
            <img
              src={import.meta.env.VITE_APP_LOGO_URL || '/branding/cocris/logo-cocris.png'}
              alt={import.meta.env.VITE_APP_NAME || 'COCRIS Pedagógico'}
              className="h-24 w-auto object-contain drop-shadow-2xl"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = 'flex';
              }}
            />
            {/* Fallback texto (oculto por padrão) */}
            <div className="hidden items-center gap-3" aria-hidden="true">
              <div className="w-16 h-16 bg-[var(--surface-brand)] border border-[var(--border-brand)] rounded-2xl flex items-center justify-center shadow-ds-sm">
                <span className="text-brand-700 font-medium text-3xl">C</span>
              </div>
              <div className="text-left">
                <h1 className="text-4xl font-black tracking-tight">{import.meta.env.VITE_APP_NAME || 'COCRIS Pedagógico'}</h1>
                <p className="text-[var(--text-brand)] text-sm font-medium tracking-widest uppercase">Sistema Pedagógico</p>
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-4 leading-tight">
            Educação mais<br />
            <span className="text-brand-600 dark:text-brand-300">inteligente</span> e cuidadosa
          </h2>
          <p className="text-[var(--text-secondary)] text-lg leading-relaxed mb-8">
            Planejamentos, chamadas, relatórios e acompanhamento do desenvolvimento das crianças — tudo em um só lugar.
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 gap-3 text-left">
            {[
              { icon: '📋', text: 'Chamada diária com 1 clique' },
              { icon: '📚', text: 'Planejamentos baseados na BNCC' },
              { icon: '📊', text: 'Relatórios e análises automáticas' },
              { icon: '🤖', text: 'Assistente de IA para educadores' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-[var(--surface-brand)] border border-[var(--border-brand)] rounded-xl px-4 py-3">
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm font-normal text-[var(--text-primary)]">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo mobile — COCRIS institucional */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <img
              src={import.meta.env.VITE_APP_LOGO_URL || '/branding/cocris/logo-cocris.png'}
              alt={import.meta.env.VITE_APP_NAME || 'COCRIS Pedagógico'}
              className="h-16 w-auto object-contain drop-shadow-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = 'flex';
              }}
            />
            {/* Fallback texto mobile (oculto por padrão) */}
            <div className="hidden items-center gap-3" aria-hidden="true">
              <div className="w-12 h-12 bg-[var(--surface-brand)] border border-[var(--border-brand)] rounded-xl flex items-center justify-center shadow-ds-sm">
                <span className="text-brand-700 font-medium text-2xl">C</span>
              </div>
              <div>
                <h1 className="text-2xl font-normal text-[var(--text-primary)]">{import.meta.env.VITE_APP_NAME || 'COCRIS Pedagógico'}</h1>
                <p className="text-[var(--text-brand)] text-xs">Sistema Pedagógico</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-3xl shadow-ds-md p-8 lg:p-10">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-brand-500" />
                <span className="text-sm font-medium text-[var(--text-brand)] uppercase tracking-wide">Bem-vindo de volta</span>
              </div>
              <h2 className="text-2xl font-normal text-[var(--text-primary)]">Acesse sua conta</h2>
              <p className="text-[var(--text-secondary)] text-sm mt-1">Entre com seu e-mail e senha cadastrados</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* E-mail */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 border border-[var(--border-default)] bg-[var(--surface-inset)] rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 transition-all text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                />
              </div>

              {/* Senha */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 border border-[var(--border-default)] bg-[var(--surface-inset)] rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 transition-all text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-brand)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Botão */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-medium rounded-xl transition-all shadow-ds-brand disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <BookOpen className="h-5 w-5" />
                    Entrar no Sistema
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] text-center">
              <p className="text-xs text-[var(--text-tertiary)]">
                {import.meta.env.VITE_APP_NAME || 'COCRIS Pedagógico'} © 2026 — Sistema Pedagógico Inteligente
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
