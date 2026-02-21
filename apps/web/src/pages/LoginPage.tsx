import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles } from '../app/RoleProtectedRoute';
import { getRedirectPathByRoles } from '../hooks/useRedirectByRole';
import { getErrorMessage } from '../utils/errorMessage';
import { Eye, EyeOff, BookOpen, Sparkles } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(email, password);
      const roles = normalizeRoles(userData);
      const redirectPath = getRedirectPathByRoles(roles);
      navigate(redirectPath);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'E-mail ou senha incorretos. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #1d4ed8 100%)' }}>
      {/* Painel esquerdo — identidade visual */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #60a5fa, transparent)', transform: 'translate(-30%, -30%)' }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #93c5fd, transparent)', transform: 'translate(30%, 30%)' }} />

        <div className="relative z-10 max-w-md text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
              <span className="text-blue-700 font-black text-3xl">C</span>
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-black tracking-tight">Conexa</h1>
              <p className="text-blue-200 text-sm font-medium tracking-widest uppercase">V3.0 Sistema Pedagógico</p>
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
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-blue-700 font-black text-2xl">C</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Conexa V3.0</h1>
              <p className="text-blue-200 text-xs">Sistema Pedagógico</p>
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
                Conexa V3.0 © 2026 — Sistema Pedagógico Inteligente
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
