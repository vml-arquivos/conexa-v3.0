import { MapPin, Phone, Mail, Clock, Users, ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useParams } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { trpc } from '@/lib/trpc';

export default function UnidadeDetail() {
  const params = useParams<{ slug: string }>();
  const { data: unit, isLoading, error } = trpc.units.getBySlug.useQuery({ slug: params.slug || '' });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {isLoading && (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        )}

        {error && (
          <div className="container py-32 text-center">
            <p className="text-destructive text-lg mb-6">Erro ao carregar informações da unidade.</p>
            <Link href="/unidades">
              <button className="btn-primary inline-flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                Voltar para Unidades
              </button>
            </Link>
          </div>
        )}

        {!unit && !isLoading && !error && (
          <div className="container py-32 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">Unidade não encontrada</h2>
            <p className="text-foreground/70 mb-6">A unidade que você está procurando não existe ou foi removida.</p>
            <Link href="/unidades">
              <button className="btn-primary inline-flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                Voltar para Unidades
              </button>
            </Link>
          </div>
        )}

        {unit && (
          <>
            {/* Hero Section */}
            <section className="relative h-[400px] md:h-[500px]">
              <img
                src={unit.imageUrl || '/images/cepi-exterior.jpg'}
                alt={`${unit.unitName} - Educação Infantil COCRIS`}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent"></div>
              
              <div className="relative z-10 container h-full flex flex-col justify-end pb-12">
                <Link href="/unidades">
                  <button className="mb-6 inline-flex items-center gap-2 text-white hover:text-white/80 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    Voltar para Unidades
                  </button>
                </Link>
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">{unit.unitName}</h1>
                <p className="text-xl text-white/90">{unit.city} - {unit.state}</p>
              </div>
            </section>

            {/* Content Section */}
            <section className="py-20 md:py-32 bg-white">
              <div className="container">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
                  {/* Main Content */}
                  <div className="lg:col-span-2">
                    <h2 className="text-3xl font-bold text-primary mb-6">Sobre a Unidade</h2>
                    
                    {unit.description && (
                      <p className="text-lg text-foreground/80 leading-relaxed mb-8">
                        {unit.description}
                      </p>
                    )}

                    <div className="prose max-w-none">
                      <p className="text-foreground/80 leading-relaxed mb-6">
                        Nossa unidade oferece educação infantil de qualidade, com profissionais qualificados e dedicados ao desenvolvimento integral das crianças. Proporcionamos um ambiente seguro, acolhedor e estimulante, onde cada criança pode desenvolver suas potencialidades físicas, cognitivas, emocionais e sociais.
                      </p>

                      <h3 className="text-2xl font-bold text-primary mt-8 mb-4">Serviços Oferecidos</h3>
                      <ul className="space-y-3 text-foreground/80">
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>Educação infantil de qualidade com metodologia pedagógica moderna</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>Alimentação nutritiva e balanceada (café da manhã, almoço e lanche)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>Atividades lúdicas e recreativas para desenvolvimento integral</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>Acompanhamento pedagógico individualizado</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>Ambiente seguro e acolhedor</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>Profissionais qualificados e dedicados</span>
                        </li>
                      </ul>

                      <h3 className="text-2xl font-bold text-primary mt-8 mb-4">Horário de Funcionamento</h3>
                      <div className="flex items-center gap-3 text-foreground/80">
                        <Clock className="w-5 h-5 text-primary" />
                        <span>Segunda a Sexta: 7h às 17h</span>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* Contact Card */}
                    <div className="card-premium">
                      <h3 className="text-xl font-bold text-primary mb-4">Informações de Contato</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-foreground mb-1">Endereço</p>
                            <p className="text-sm text-foreground/70">{unit.addressPublic}</p>
                          </div>
                        </div>

                        {unit.phonePublic && (
                          <div className="flex items-start gap-3">
                            <Phone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-foreground mb-1">Telefone</p>
                              <a 
                                href={`tel:${unit.phonePublic}`} 
                                className="text-sm text-primary hover:text-primary/80 transition-colors"
                              >
                                {unit.phonePublic}
                              </a>
                            </div>
                          </div>
                        )}

                        {unit.emailPublic && (
                          <div className="flex items-start gap-3">
                            <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-foreground mb-1">Email</p>
                              <a 
                                href={`mailto:${unit.emailPublic}`} 
                                className="text-sm text-primary hover:text-primary/80 transition-colors break-all"
                              >
                                {unit.emailPublic}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 pt-6 border-t border-border">
                        <Link href="/contato">
                          <button className="w-full btn-primary">
                            Entrar em Contato
                          </button>
                        </Link>
                      </div>
                    </div>

                    {/* Stats Card */}
                    <div className="card-premium bg-gradient-to-br from-primary/5 to-secondary/5">
                      <h3 className="text-xl font-bold text-primary mb-4">Sobre a COCRIS</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Users className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-primary">20K+</p>
                            <p className="text-sm text-foreground/70">Crianças Atendidas</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-secondary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-secondary">6</p>
                            <p className="text-sm text-foreground/70">Unidades Ativas</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Map Section */}
            <section className="py-20 md:py-32 bg-muted">
              <div className="container">
                <h2 className="text-3xl font-bold text-primary mb-8 text-center">Localização</h2>
                <div className="bg-white rounded-xl shadow-lg p-4 max-w-4xl mx-auto">
                  <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-foreground/50">Mapa interativo será carregado aqui</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
