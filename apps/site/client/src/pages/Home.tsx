import { Heart, Users, BookOpen, Award, ArrowRight, Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SEO from '@/components/SEO';
import SchemaOrg from '@/components/SchemaOrg';

export default function Home() {
  const values = [
    {
      icon: Heart,
      title: 'Afeto e Cuidado',
      description: 'Promovemos um ambiente de cuidados, afeto e aprendizagem responsável, saudável e feliz.',
    },
    {
      icon: Users,
      title: 'Respeito e Solidariedade',
      description: 'Valorizamos relações humanas baseadas no afeto, respeito a si e ao outro, e na solidariedade.',
    },
    {
      icon: BookOpen,
      title: 'Educação de Qualidade',
      description: 'Oferecemos ensino de qualidade que busca a integração das diferentes áreas do conhecimento.',
    },
    {
      icon: Award,
      title: 'Desenvolvimento Integral',
      description: 'Trabalhamos a criança em seus aspectos físico, psicológico, intelectual e social.',
    },
  ];

  const stats = [
    { number: '7', label: 'Unidades Educacionais', icon: MapPin },
    { number: '1000+', label: 'Crianças Atendidas', icon: Users },
    { number: '25+', label: 'Anos de História', icon: Award },
    { number: '100+', label: 'Colaboradores', icon: Heart },
  ];

  return (
    <>
      <SEO 
        title="COCRIS - Associação Beneficente Coração de Cristo"
        description="A COCRIS é uma organização sem fins lucrativos dedicada à educação infantil e assistência social, promovendo o desenvolvimento de crianças em vulnerabilidade social através de valores éticos e educacionais."
        keywords="COCRIS, educação infantil, assistência social, Brasília, CEPI, creche, desenvolvimento infantil"
      />
      <SchemaOrg />
      
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main>
          {/* Hero Section */}
          <section className="hero-section relative">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: 'url(https://files.manuscdn.com/user_upload_by_module/session_file/310519663355075489/ppuBdPmxegwdlNhk.png)',
              }}
            />
            <div className="absolute inset-0 bg-primary/30" />
            
            <div className="container relative z-10 text-white text-center animate-fade-in-up">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Transformando Vidas Através da <br />
                <span className="text-yellow-300">Educação e do Amor</span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto font-light">
                Promovemos o acesso aos direitos das crianças em vulnerabilidade social, 
                transformando-os por meio do desenvolvimento comunitário.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/doacoes">
                  <Button size="lg" className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-6">
                    Fazer uma Doação
                    <Heart className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/quem-somos">
                  <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-primary text-lg px-8 py-6">
                    Conheça Nossa História
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-16 bg-gradient-to-br from-primary/10 to-secondary/10">
            <div className="container">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                      <stat.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-4xl font-bold text-primary mb-2">{stat.number}</div>
                    <div className="text-muted-foreground font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Mission Section */}
          <section className="py-20 bg-white">
            <div className="container">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="animate-fade-in-up">
                  <img 
                    src="/images/activities/atividade-1.jpg" 
                    alt="Crianças em atividade educacional na COCRIS"
                    className="rounded-2xl shadow-2xl hover-lift"
                  />
                </div>
                <div className="animate-slide-in-right">
                  <h2 className="text-4xl font-bold mb-6 text-primary">Nossa Missão</h2>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    Contribuir para o desenvolvimento das potencialidades físicas e psíquicas das crianças, 
                    direcionando-as para a conquista de Valor Humano Universal, tornando-as cidadãs criativas, 
                    conscientes de seu papel e responsabilidades, capazes de lidar com uma sociedade em constante mutação.
                  </p>
                  <div className="bg-primary/5 border-l-4 border-primary p-6 rounded-r-lg mb-6">
                    <p className="text-muted-foreground italic">
                      "E tudo quanto fizerdes, fazei-o de coração, como ao Senhor, e não aos homens."
                    </p>
                    <p className="text-sm text-primary font-semibold mt-2">Colossenses 3:23</p>
                  </div>
                  <Link href="/quem-somos">
                    <Button className="btn-primary">
                      Saiba Mais Sobre Nós
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Values Section */}
          <section className="py-20 bg-gradient-to-br from-secondary/5 to-primary/5">
            <div className="container">
              <div className="text-center mb-16 animate-fade-in-up">
                <h2 className="text-4xl font-bold mb-4 text-primary">Nossos Valores</h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  A COCRIS tem valores que norteiam o trabalho na instituição e visa a "Qualidade" 
                  nas relações humanas, baseadas no afeto, no respeito, na solidariedade e na alegria.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {values.map((value, index) => (
                  <Card key={index} className="card-premium hover-lift animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                    <CardContent className="p-6 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <value.icon className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-foreground">{value.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Units Preview Section */}
          <section className="py-20 bg-white">
            <div className="container">
              <div className="text-center mb-16 animate-fade-in-up">
                <h2 className="text-4xl font-bold mb-4 text-primary">Nossas Unidades</h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Conheça os CEPIs e Creches onde desenvolvemos nosso trabalho de educação infantil 
                  com excelência e dedicação.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <Card className="overflow-hidden hover-lift animate-fade-in-up">
                  <img 
                    src="/images/units/Arara-Caninde.png" 
                    alt="CEPI Arara Canindé"
                    className="w-full h-48 object-cover"
                  />
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-2 text-primary">CEPI Arara Canindé</h3>
                    <p className="text-muted-foreground mb-4">Educação infantil de qualidade no Recanto das Emas</p>
                    <Link href="/unidades/cepi-arara-caninde">
                      <Button variant="outline" className="w-full">
                        Saiba Mais
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden hover-lift animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  <img 
                    src="/images/units/CEPI-FLAMBOYANT.png" 
                    alt="CEPI Flamboyant"
                    className="w-full h-48 object-cover"
                  />
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-2 text-primary">CEPI Flamboyant</h3>
                    <p className="text-muted-foreground mb-4">Ambiente acolhedor para o desenvolvimento infantil</p>
                    <Link href="/unidades/cepi-flamboyant">
                      <Button variant="outline" className="w-full">
                        Saiba Mais
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden hover-lift animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  <img 
                    src="/images/units/cepi-sabia-do-campo.jpg" 
                    alt="CEPI Sabiá do Campo"
                    className="w-full h-48 object-cover"
                  />
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-2 text-primary">CEPI Sabiá do Campo</h3>
                    <p className="text-muted-foreground mb-4">Espaço de aprendizado e crescimento</p>
                    <Link href="/unidades/cepi-sabia-do-campo">
                      <Button variant="outline" className="w-full">
                        Saiba Mais
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center">
                <Link href="/unidades">
                  <Button size="lg" className="btn-primary">
                    Ver Todas as Unidades
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 bg-gradient-to-br from-primary to-secondary text-white">
            <div className="container text-center">
              <div className="max-w-3xl mx-auto animate-fade-in-up">
                <h2 className="text-4xl font-bold mb-6">Faça Parte Dessa Transformação</h2>
                <p className="text-xl mb-8 opacity-90">
                  Sua contribuição ajuda a transformar vidas e construir um futuro melhor para 
                  centenas de crianças em situação de vulnerabilidade social.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/doacoes">
                    <Button size="lg" className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-6">
                      Doar Agora
                      <Heart className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/contato">
                    <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-primary text-lg px-8 py-6">
                      Entre em Contato
                      <Phone className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Info Section */}
          <section className="py-16 bg-muted">
            <div className="container">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="animate-fade-in-up">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Phone className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Telefone</h3>
                  <p className="text-muted-foreground">(61) 3575-4125</p>
                  <p className="text-muted-foreground">(61) 3575-4119</p>
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">E-mail</h3>
                  <p className="text-muted-foreground">contato@cocris.org</p>
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <MapPin className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Endereço</h3>
                  <p className="text-muted-foreground">Avenida Recanto das Emas, Quadra 301, Lote 26</p>
                  <p className="text-muted-foreground">Brasília-DF</p>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
