import { Heart, CreditCard, Building2, Smartphone, QrCode, Check, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { trpc } from '@/lib/trpc';

export default function Doacoes() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [frequency, setFrequency] = useState<'one-time' | 'monthly'>('one-time');

  const { data: totals } = trpc.donations.getTotals.useQuery();

  const suggestedAmounts = [2000, 5000, 10000, 20000, 50000]; // Values in cents

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary via-primary/90 to-secondary py-20 md:py-32">
          <div className="container text-white">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6">
                <Heart className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">Faça sua Doação</h1>
              <p className="text-xl md:text-2xl text-white/90 mb-8">
                Sua contribuição transforma vidas e garante educação de qualidade para crianças em vulnerabilidade social
              </p>
              
              {/* Progress Bar */}
              {totals && (
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-white/90 font-semibold">Meta Anual 2026</span>
                    <span className="text-white font-bold text-xl">{formatCurrency(totals.total || 0)}</span>
                  </div>
                  <div className="w-full bg-white/30 rounded-full h-4 overflow-hidden">
                    <div 
                      className="bg-white h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(((totals.total || 0) / 50000000) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-white/80 text-sm mt-2">{totals.count || 0} doações realizadas</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Donation Form Section */}
        <section className="py-20 md:py-32 bg-white">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="card-premium">
                <h2 className="text-3xl font-bold text-primary mb-8 text-center">Escolha o Valor da sua Doação</h2>

                {/* Frequency Toggle */}
                <div className="flex justify-center gap-4 mb-8">
                  <button
                    onClick={() => setFrequency('one-time')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                      frequency === 'one-time'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    Doação Única
                  </button>
                  <button
                    onClick={() => setFrequency('monthly')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                      frequency === 'monthly'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    Doação Mensal
                  </button>
                </div>

                {/* Suggested Amounts */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                  {suggestedAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount('');
                      }}
                      className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                        selectedAmount === amount
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-2xl font-bold text-primary">{formatCurrency(amount)}</div>
                    </button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div className="mb-8">
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Ou digite outro valor:
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/70">R$</span>
                    <input
                      type="number"
                      placeholder="0,00"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setSelectedAmount(null);
                      }}
                      className="w-full pl-12 pr-4 py-4 border-2 border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                {/* Donation Button */}
                <button className="w-full btn-primary text-lg py-4 inline-flex items-center justify-center gap-2">
                  <Heart className="w-6 h-6" />
                  Continuar para Pagamento
                  <ArrowRight className="w-5 h-5" />
                </button>

                <p className="text-center text-sm text-foreground/60 mt-4">
                  Suas informações estão seguras e protegidas
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Methods */}
        <section className="py-20 md:py-32 bg-muted">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-primary mb-12 text-center">Formas de Pagamento</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card-premium">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <CreditCard className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-2">Cartão de Crédito</h3>
                  <p className="text-foreground/70 mb-4">
                    Pagamento seguro via cartão de crédito. Parcelamento disponível.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-foreground/60">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Processamento instantâneo</span>
                  </div>
                </div>

                <div className="card-premium">
                  <div className="w-14 h-14 bg-secondary/10 rounded-xl flex items-center justify-center mb-4">
                    <Smartphone className="w-7 h-7 text-secondary" />
                  </div>
                  <h3 className="text-xl font-bold text-secondary mb-2">PIX</h3>
                  <p className="text-foreground/70 mb-4">
                    Transferência instantânea via PIX. Rápido e seguro.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-foreground/60">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Confirmação imediata</span>
                  </div>
                </div>

                <div className="card-premium">
                  <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                    <Building2 className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-accent mb-2">Transferência Bancária</h3>
                  <p className="text-foreground/70 mb-4">
                    Depósito ou transferência diretamente em nossa conta.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-foreground/60">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Sem taxas adicionais</span>
                  </div>
                </div>

                <div className="card-premium">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <QrCode className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-2">Boleto Bancário</h3>
                  <p className="text-foreground/70 mb-4">
                    Gere um boleto e pague em qualquer banco ou lotérica.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-foreground/60">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Vencimento em 3 dias úteis</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bank Info Section */}
        <section className="py-20 md:py-32 bg-white">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-primary mb-8 text-center">Dados Bancários para Transferência</h2>
              
              <div className="card-premium bg-gradient-to-br from-primary/5 to-secondary/5">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="font-semibold text-foreground">Banco:</span>
                    <span className="text-foreground/80">Banco do Brasil</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="font-semibold text-foreground">Agência:</span>
                    <span className="text-foreground/80">0000-0</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="font-semibold text-foreground">Conta Corrente:</span>
                    <span className="text-foreground/80">00000-0</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="font-semibold text-foreground">CNPJ:</span>
                    <span className="text-foreground/80">00.000.000/0000-00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">Favorecido:</span>
                    <span className="text-foreground/80">Associação Beneficente Coração de Cristo</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Importante:</strong> Após realizar a transferência, envie o comprovante para nosso email para emissão do recibo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Impact Section */}
        <section className="py-20 md:py-32 bg-gradient-to-r from-primary to-secondary text-white">
          <div className="container text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Seu Impacto</h2>
            <p className="text-xl mb-12 text-white/90 max-w-3xl mx-auto">
              Cada doação faz diferença real na vida de crianças e suas famílias
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
                <div className="text-4xl font-bold mb-2">R$ 20</div>
                <p className="text-white/90">Alimenta uma criança por um dia</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
                <div className="text-4xl font-bold mb-2">R$ 100</div>
                <p className="text-white/90">Material escolar para uma criança</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
                <div className="text-4xl font-bold mb-2">R$ 500</div>
                <p className="text-white/90">Apoia uma criança por um mês</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 md:py-32 bg-white">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-primary mb-12 text-center">Perguntas Frequentes</h2>
              
              <div className="space-y-6">
                <div className="card-premium">
                  <h3 className="text-xl font-bold text-primary mb-3">Minha doação é dedutível do Imposto de Renda?</h3>
                  <p className="text-foreground/70">
                    Sim! Doações para a COCRIS podem ser deduzidas do Imposto de Renda conforme legislação vigente. Emitimos recibo para todas as doações.
                  </p>
                </div>

                <div className="card-premium">
                  <h3 className="text-xl font-bold text-primary mb-3">Como posso acompanhar o uso da minha doação?</h3>
                  <p className="text-foreground/70">
                    Publicamos relatórios de transparência regularmente em nossa página de Transparência. Você também pode solicitar informações específicas através do nosso contato.
                  </p>
                </div>

                <div className="card-premium">
                  <h3 className="text-xl font-bold text-primary mb-3">Posso doar para uma unidade específica?</h3>
                  <p className="text-foreground/70">
                    Sim! Durante o processo de doação, você pode escolher destinar sua contribuição para uma unidade específica ou para o projeto geral da COCRIS.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-32 bg-muted">
          <div className="container text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">Outras Formas de Ajudar</h2>
            <p className="text-xl text-foreground/70 mb-8 max-w-2xl mx-auto">
              Além de doações financeiras, você pode contribuir de outras maneiras
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contato">
                <button className="btn-outline inline-flex items-center gap-2">
                  Seja Voluntário
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
              <Link href="/projetos">
                <button className="btn-outline inline-flex items-center gap-2">
                  Conheça Nossos Projetos
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
