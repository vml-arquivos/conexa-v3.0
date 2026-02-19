import { MapPin, Phone, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { trpc } from '@/lib/trpc';

export default function Unidades() {
  const { data: units, isLoading, error } = trpc.units.getAll.useQuery();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary via-primary/90 to-secondary py-20 md:py-32">
          <div className="container text-white text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Nossas Unidades Educacionais</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Administramos 7 unidades de educação infantil no Distrito Federal, oferecendo educação de qualidade, alimentação nutritiva e um ambiente acolhedor para centenas de crianças
            </p>
          </div>
        </section>

        {/* Units Grid */}
        <section className="py-20 md:py-32 bg-white">
          <div className="container">
            {isLoading && (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
            )}

            {error && (
              <div className="text-center py-20">
                <p className="text-destructive text-lg">Erro ao carregar unidades. Tente novamente mais tarde.</p>
              </div>
            )}

            {units && units.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {units.map((unit) => (
                  <div key={unit.id} className="card-premium hover-lift hover-glow group">
                    {/* Unit Image */}
                    <div className="relative h-48 mb-6 -mx-6 -mt-6 rounded-t-xl overflow-hidden">
                      <img
                        src={unit.imageUrl || '/images/cepi-exterior.jpg'}
                        alt={`${unit.unitName} - Educação Infantil COCRIS`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-xl font-bold text-white mb-1">{unit.unitName}</h3>
                        <p className="text-sm text-white/90">{unit.city} - {unit.state}</p>
                      </div>
                    </div>

                    {/* Unit Info */}
                    <div className="space-y-4">
                      {unit.description && (
                        <p className="text-foreground/70 text-sm leading-relaxed line-clamp-3">
                          {unit.description}
                        </p>
                      )}

                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <p className="text-foreground/70">{unit.addressPublic}</p>
                        </div>

                        {unit.phonePublic && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                            <a href={`tel:${unit.phonePublic}`} className="text-foreground/70 hover:text-primary transition-colors">
                              {unit.phonePublic}
                            </a>
                          </div>
                        )}

                        {unit.emailPublic && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                            <a href={`mailto:${unit.emailPublic}`} className="text-foreground/70 hover:text-primary transition-colors break-all">
                              {unit.emailPublic}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-border">
                        <Link href={`/unidades/${unit.slug}`}>
                          <button className="w-full btn-outline inline-flex items-center justify-center gap-2">
                            Ver Detalhes
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {units && units.length === 0 && (
              <div className="text-center py-20">
                <p className="text-foreground/70 text-lg">Nenhuma unidade encontrada.</p>
              </div>
            )}
          </div>
        </section>

        {/* Map Section */}
        <section className="py-20 md:py-32 bg-muted">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">Localização das Unidades</h2>
              <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
                Nossas unidades estão estrategicamente localizadas no Recanto das Emas e Brazlândia para atender comunidades em vulnerabilidade social
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="w-full h-[500px] bg-muted rounded-lg flex items-center justify-center">
                <p className="text-foreground/50">Mapa interativo será carregado aqui</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-32 bg-gradient-to-r from-primary to-secondary text-white">
          <div className="container text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Quer Conhecer Nossas Unidades?</h2>
            <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
              Entre em contato conosco para agendar uma visita e conhecer de perto nosso trabalho
            </p>
            <Link href="/contato">
              <button className="btn-secondary bg-white text-primary hover:bg-white/90 inline-flex items-center gap-2 text-lg">
                Entrar em Contato
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
