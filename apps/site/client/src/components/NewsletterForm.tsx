import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const subscribeMutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => {
      toast.success('Inscrição realizada com sucesso! Verifique seu email.');
      setEmail('');
      setName('');
    },
    onError: (error) => {
      toast.error('Erro ao realizar inscrição. Tente novamente.');
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Por favor, insira um email válido.');
      return;
    }
    subscribeMutation.mutate({ email, name });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="Seu nome (opcional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:ring-2 focus:ring-white focus:border-transparent"
        />
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
          <input
            type="email"
            placeholder="Seu melhor email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:ring-2 focus:ring-white focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={subscribeMutation.isPending}
          className="px-6 py-2 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {subscribeMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando...
            </>
          ) : (
            'Inscrever'
          )}
        </button>
      </div>
      <p className="text-xs text-white/70">
        Respeitamos sua privacidade. Cancele a qualquer momento.
      </p>
    </form>
  );
}
