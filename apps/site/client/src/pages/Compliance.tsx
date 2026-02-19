import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Shield, FileText, AlertCircle, Scale } from 'lucide-react';

export default function Compliance() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Compliance e Ética - COCRIS"
        description="Conheça nossos códigos de ética, políticas de conformidade e canal de denúncias da COCRIS."
      />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary via-primary/90 to-secondary py-20 md:py-32">
          <div className="container text-white text-center">
            <Shield className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Compliance e Ética</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Compromisso com a transparência, ética e conformidade em todas as nossas ações
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-20 md:py-32 bg-white">
          <div className="container max-w-4xl">
            <div className="space-y-12">
              {/* Código de Ética */}
              <div className="card-premium">
                <div className="flex items-start gap-4 mb-6">
                  <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Código de Ética</h2>
                    <div className="space-y-4 text-foreground/70">
                      <p>
                        A COCRIS pauta suas ações em princípios éticos sólidos, baseados nos valores cristãos
                        da Assembleia de Deus Isabelle e no compromisso com o bem-estar das crianças.
                      </p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li>Respeito à dignidade e aos direitos de todas as crianças</li>
                        <li>Transparência na gestão de recursos públicos e privados</li>
                        <li>Compromisso com a excelência educacional</li>
                        <li>Integridade nas relações com colaboradores, famílias e parceiros</li>
                        <li>Responsabilidade social e ambiental</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* LGPD */}
              <div className="card-premium">
                <div className="flex items-start gap-4 mb-6">
                  <Scale className="w-8 h-8 text-primary flex-shrink-0" />
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Proteção de Dados (LGPD)</h2>
                    <div className="space-y-4 text-foreground/70">
                      <p>
                        Estamos em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018),
                        garantindo a privacidade e segurança das informações pessoais de crianças, famílias e colaboradores.
                      </p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li>Coleta mínima de dados necessários para prestação de serviços</li>
                        <li>Armazenamento seguro e criptografado de informações sensíveis</li>
                        <li>Direito de acesso, correção e exclusão de dados pessoais</li>
                        <li>Consentimento explícito para uso de imagens e informações</li>
                        <li>Treinamento contínuo da equipe sobre proteção de dados</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Canal de Denúncias */}
              <div className="card-premium bg-amber-50 border-amber-200">
                <div className="flex items-start gap-4 mb-6">
                  <AlertCircle className="w-8 h-8 text-amber-600 flex-shrink-0" />
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Canal de Denúncias</h2>
                    <div className="space-y-4 text-foreground/70">
                      <p>
                        Disponibilizamos um canal confidencial para denúncias de irregularidades, violações éticas
                        ou situações que possam comprometer o bem-estar das crianças.
                      </p>
                      <div className="bg-white p-6 rounded-lg border border-amber-200 space-y-3">
                        <p className="font-semibold text-foreground">Como denunciar:</p>
                        <p>📧 Email: <a href="mailto:denuncia@cocris.org" className="text-primary hover:underline">denuncia@cocris.org</a></p>
                        <p>📞 Telefone: <a href="tel:+556121234567" className="text-primary hover:underline">(61) 2123-4567</a></p>
                        <p className="text-sm text-foreground/60 mt-4">
                          * Todas as denúncias são tratadas com sigilo e investigadas por comissão independente.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
