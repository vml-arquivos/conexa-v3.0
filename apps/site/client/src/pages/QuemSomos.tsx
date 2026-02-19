import { Award, Users, Target, Handshake } from 'lucide-react';
import { Link } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function QuemSomos() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Page Header */}
        <section className="bg-gradient-to-r from-primary/10 to-secondary/10 py-12 md:py-16">
          <div className="container">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Quem Somos
            </h1>
            <p className="text-lg text-foreground/70 max-w-2xl">
              Conheça a história, missão e governança da Associação Beneficente Coração de Cristo.
            </p>
          </div>
        </section>

        {/* History Section */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-8">
                Nossa História
              </h2>
              <div className="space-y-6 text-foreground/80 leading-relaxed">
                <p>
                  A Associação Beneficente Coração de Cristo (COCRIS) foi fundada com o propósito de transformar vidas através da educação infantil de qualidade. Nascida da visão de oferecer oportunidades iguais a crianças em vulnerabilidade social, a COCRIS consolidou-se como uma referência em educação infantil em Brasília.
                </p>
                <p>
                  Ao longo de mais de uma década de atuação, a organização expandiu suas operações, criando sete unidades educacionais que atendem milhares de crianças anualmente. Cada unidade foi pensada para oferecer um ambiente seguro, acolhedor e estimulante para o desenvolvimento integral das crianças.
                </p>
                <p>
                  Nosso compromisso com a excelência pedagógica, transparência financeira e responsabilidade social nos posicionou como uma organização confiável e impactante. Acreditamos que a educação infantil de qualidade é o alicerce para uma sociedade mais justa e igualitária.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Mission, Vision, Values */}
        <section className="py-16 md:py-24 bg-muted">
          <div className="container">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary">
              Nossos Pilares
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="card-cocris">
                <Target className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-bold text-primary mb-4">Missão</h3>
                <p className="text-foreground/70 leading-relaxed">
                  Contribuir para o desenvolvimento das potencialidades físicas e psíquicas das crianças, direcionando-as para a conquista de Valor Humano Universal, tornando-as cidadãs criativas, conscientes de seu papel e responsabilidades.
                </p>
              </div>
              <div className="card-cocris">
                <Award className="w-10 h-10 text-secondary mb-4" />
                <h3 className="text-xl font-bold text-secondary mb-4">Visão</h3>
                <p className="text-foreground/70 leading-relaxed">
                  Ser reconhecida como uma OSC de Excelência em Educação Infantil, transmitindo valores baseados na moral e ética, promovendo conhecimento com afeto e respeito, de forma lúdica e criativa.
                </p>
              </div>
              <div className="card-cocris">
                <Handshake className="w-10 h-10 text-accent mb-4" />
                <h3 className="text-xl font-bold text-accent mb-4">Valores</h3>
                <p className="text-foreground/70 leading-relaxed">
                  Qualidade nas relações humanas baseadas no afeto, respeito a si e ao outro, solidariedade e alegria. Cada ação reflete nosso compromisso com a excelência e a humanidade.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Governance */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-8">
              Governança e Transparência
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h3 className="text-2xl font-bold text-primary mb-6">Estrutura Organizacional</h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold text-foreground mb-1">Assembleia Geral</h4>
                    <p className="text-sm text-foreground/70">Órgão máximo de deliberação da organização</p>
                  </div>
                  <div className="border-l-4 border-secondary pl-4">
                    <h4 className="font-semibold text-foreground mb-1">Conselho Administrativo</h4>
                    <p className="text-sm text-foreground/70">Responsável pela gestão estratégica</p>
                  </div>
                  <div className="border-l-4 border-accent pl-4">
                    <h4 className="font-semibold text-foreground mb-1">Diretoria Executiva</h4>
                    <p className="text-sm text-foreground/70">Implementação das políticas e estratégias</p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold text-foreground mb-1">Auditoria Independente</h4>
                    <p className="text-sm text-foreground/70">Verificação de conformidade e legalidade</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-primary mb-6">Compromissos</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Transparência Total</h4>
                      <p className="text-sm text-foreground/70">Todos os documentos financeiros e pedagógicos disponíveis</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Prestação de Contas</h4>
                      <p className="text-sm text-foreground/70">Relatórios anuais auditados e publicados</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-accent-foreground text-sm font-bold">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Conformidade Legal</h4>
                      <p className="text-sm text-foreground/70">Cumprimento de todas as regulamentações</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Ouvidoria Ativa</h4>
                      <p className="text-sm text-foreground/70">Canal aberto para sugestões e denúncias</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team Stats */}
        <section className="py-16 md:py-24 bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="container">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary">
              Nossa Equipe
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">700+</div>
                <p className="text-foreground/70">Profissionais Dedicados</p>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-secondary mb-2">95%</div>
                <p className="text-foreground/70">Taxa de Retenção</p>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-accent mb-2">100h+</div>
                <p className="text-foreground/70">Treinamento Anual</p>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">7</div>
                <p className="text-foreground/70">Unidades Educacionais</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary">
              Quer Conhecer Mais?
            </h2>
            <p className="text-lg text-foreground/70 mb-8 max-w-2xl mx-auto">
              Visite uma de nossas unidades ou entre em contato para saber mais sobre nossos programas e como você pode contribuir.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/transparencia">
                <a className="btn-primary">
                  Ver Documentos
                </a>
              </Link>
              <Link href="/contato">
                <a className="btn-outline">
                  Entrar em Contato
                </a>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
