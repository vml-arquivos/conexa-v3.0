import { Lightbulb, Users, Target, Heart, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Projetos() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary via-primary/90 to-secondary py-20 md:py-32">
          <div className="container text-white text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Nossos Projetos</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Programas e iniciativas que transformam vidas através da educação, capacitação e desenvolvimento social
            </p>
          </div>
        </section>

        {/* Main Project - Unnijovem */}
        <section className="py-20 md:py-32 bg-white">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto mb-20">
              <div>
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
                  <Lightbulb className="w-5 h-5" />
                  <span className="font-semibold">Projeto Destaque</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">Unnijovem</h2>
                <p className="text-lg text-foreground/80 leading-relaxed mb-6">
                  O <strong>Unnijovem</strong> é nosso programa de capacitação profissional e desenvolvimento pessoal voltado para jovens em situação de vulnerabilidade social. O projeto oferece cursos, oficinas e mentorias que preparam os jovens para o mercado de trabalho e para a vida.
                </p>
                <p className="text-lg text-foreground/80 leading-relaxed mb-6">
                  Através do Unnijovem, já capacitamos centenas de jovens em diversas áreas, promovendo autonomia, empregabilidade e transformação social. O programa inclui formação técnica, desenvolvimento de habilidades socioemocionais e acompanhamento individualizado.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/contato">
                    <button className="btn-primary inline-flex items-center gap-2">
                      Saiba Mais
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </Link>
                  <Link href="/doacoes">
                    <button className="btn-outline inline-flex items-center gap-2">
                      Apoiar Projeto
                      <Heart className="w-5 h-5" />
                    </button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <img
                  src="/images/children-diversity.jpg"
                  alt="Projeto Unnijovem - Capacitação de Jovens"
                  className="rounded-2xl shadow-2xl w-full h-auto"
                />
              </div>
            </div>

            {/* Project Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary mb-2">500+</div>
                <p className="text-foreground/70 font-semibold">Jovens Capacitados</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-secondary mb-2">15+</div>
                <p className="text-foreground/70 font-semibold">Cursos Oferecidos</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-accent mb-2">80%</div>
                <p className="text-foreground/70 font-semibold">Taxa de Empregabilidade</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-primary mb-2">5+</div>
                <p className="text-foreground/70 font-semibold">Anos de Atuação</p>
              </div>
            </div>
          </div>
        </section>

        {/* Other Projects */}
        <section className="py-20 md:py-32 bg-muted">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">Outras Iniciativas</h2>
              <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
                Desenvolvemos diversos programas complementares que ampliam nosso impacto social
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Education Project */}
              <div className="card-premium hover-lift hover-glow">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                  <Target className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-primary mb-4">Educação Integral</h3>
                <p className="text-foreground/70 mb-6">
                  Programa de educação integral que complementa o currículo escolar com atividades culturais, esportivas e artísticas, promovendo o desenvolvimento completo das crianças.
                </p>
              </div>

              {/* Family Support */}
              <div className="card-premium hover-lift hover-glow">
                <div className="w-14 h-14 bg-secondary/10 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-secondary" />
                </div>
                <h3 className="text-2xl font-bold text-secondary mb-4">Apoio Familiar</h3>
                <p className="text-foreground/70 mb-6">
                  Programa de apoio e orientação às famílias, oferecendo workshops, palestras e acompanhamento psicossocial para fortalecer os vínculos familiares e comunitários.
                </p>
              </div>

              {/* Nutrition */}
              <div className="card-premium hover-lift hover-glow">
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6">
                  <Heart className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-2xl font-bold text-accent mb-4">Nutrição e Saúde</h3>
                <p className="text-foreground/70 mb-6">
                  Programa de alimentação nutritiva e educação alimentar, garantindo que todas as crianças recebam refeições balanceadas e aprendam sobre hábitos saudáveis.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-32 bg-gradient-to-r from-primary to-secondary text-white">
          <div className="container text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Faça Parte da Transformação</h2>
            <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
              Sua doação faz a diferença na vida de crianças e jovens. Apoie nossos projetos e ajude a construir um futuro melhor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/doacoes">
                <button className="btn-secondary bg-white text-primary hover:bg-white/90 inline-flex items-center gap-2 text-lg">
                  Fazer Doação
                  <Heart className="w-5 h-5" />
                </button>
              </Link>
              <Link href="/contato">
                <button className="btn-outline border-white text-white hover:bg-white hover:text-primary inline-flex items-center gap-2 text-lg">
                  Entrar em Contato
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
