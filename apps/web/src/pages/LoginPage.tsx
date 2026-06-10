import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { getRedirectPathByRoles } from '../hooks/useRedirectByRole';
import { getErrorMessage } from '../utils/errorMessage';
import { getAccessToken } from '../api/tokenStorage';
import { Eye, EyeOff, BookOpen, Sparkles, Smartphone } from 'lucide-react';

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
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        fontFamily: '"Inter","system-ui",sans-serif',
        padding: '0 24px',
        paddingTop: 'max(48px, env(safe-area-inset-top))',
        paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        justifyContent: 'space-between',
      }}>

        {/* Topo: logo e título */}
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.2)',
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
            <span style={{ display: 'none', fontSize: 28, fontWeight: 800, color: '#fff' }}>C</span>
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
            COCRIS Pedagógico
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            Gestão de educação infantil
          </p>
        </div>

        {/* Formulário */}
        <div style={{
          background: '#fff', borderRadius: 24, padding: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: '#0f172a' }}>
            Entrar
          </h2>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 12, marginBottom: 16,
              background: '#fef2f2', border: '0.5px solid #fecaca',
              fontSize: 13, color: '#dc2626',
            }}>
              {error}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 6 }}>
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
                border: '0.5px solid #e2e8f0', background: '#f8fafc',
                fontSize: 16, color: '#0f172a', outline: 'none',
              }}
            />
          </div>

          {/* Senha */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 6 }}>
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
                  border: '0.5px solid #e2e8f0', background: '#f8fafc',
                  fontSize: 16, color: '#0f172a', outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4,
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
              background: loading ? '#818cf8' : '#4f46e5',
              color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: (!email || !password) ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Entrando...
              </>
            ) : 'Entrar'}
          </button>
        </div>

        {/* Rodapé */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Smartphone size={12} /> App instalado
          </p>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #1d4ed8 100%)' }}>
      {/* Painel esquerdo — identidade visual */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #60a5fa, transparent)', transform: 'translate(-30%, -30%)' }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #93c5fd, transparent)', transform: 'translate(30%, 30%)' }} />

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
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                <span className="text-blue-700 font-black text-3xl">C</span>
              </div>
              <div className="text-left">
                <h1 className="text-4xl font-black tracking-tight">{import.meta.env.VITE_APP_NAME || 'COCRIS Pedagógico'}</h1>
                <p className="text-blue-200 text-sm font-medium tracking-widest uppercase">Sistema Pedagógico</p>
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-4 leading-tight">
            Educação mais<br />
            <span className="text-blue-300">inteligente</span> e cuidadosa
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed mb-8">
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
              <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm font-medium text-blue-50">{f.text}</span>
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
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-blue-700 font-black text-2xl">C</span>
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">{import.meta.env.VITE_APP_NAME || 'COCRIS Pedagógico'}</h1>
                <p className="text-blue-200 text-xs">Sistema Pedagógico</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-10">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Bem-vindo de volta</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Acesse sua conta</h2>
              <p className="text-gray-500 text-sm mt-1">Entre com seu e-mail e senha cadastrados</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* E-mail */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              {/* Senha */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-gray-900 placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
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

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                {import.meta.env.VITE_APP_NAME || 'COCRIS Pedagógico'} © 2026 — Sistema Pedagógico Inteligente
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
