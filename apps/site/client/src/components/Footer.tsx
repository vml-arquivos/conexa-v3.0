import { Mail, Phone, MapPin, Facebook, Instagram } from 'lucide-react';
import { Link } from 'wouter';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-muted to-primary/5 border-t border-border">
      <div className="container py-12 md:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img 
                src="/images/logo-cocris.png" 
                alt="Logo COCRIS - Associação Beneficente Coração de Cristo" 
                className="h-10 w-auto"
              />
            </div>
            <p className="text-sm text-foreground/70 leading-relaxed">
              Associação Beneficente Coração de Cristo. Transformando vidas através da educação infantil de qualidade e assistência social.
            </p>
            <div className="flex gap-4 mt-4">
              <a href="#" className="text-primary hover:text-secondary transition-colors" aria-label="Facebook COCRIS">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-primary hover:text-secondary transition-colors" aria-label="Instagram COCRIS">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Links Rápidos</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/">
                  <span className="text-foreground/70 hover:text-primary transition-colors cursor-pointer">Início</span>
                </Link>
              </li>
              <li>
                <Link href="/quem-somos">
                  <span className="text-foreground/70 hover:text-primary transition-colors cursor-pointer">Quem Somos</span>
                </Link>
              </li>
              <li>
                <Link href="/unidades">
                  <span className="text-foreground/70 hover:text-primary transition-colors cursor-pointer">Nossas Unidades</span>
                </Link>
              </li>
              <li>
                <Link href="/projetos">
                  <span className="text-foreground/70 hover:text-primary transition-colors cursor-pointer">Projetos</span>
                </Link>
              </li>
              <li>
                <Link href="/blog">
                  <span className="text-foreground/70 hover:text-primary transition-colors cursor-pointer">Blog</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Recursos</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/transparencia">
                  <span className="text-foreground/70 hover:text-primary transition-colors cursor-pointer">Transparência</span>
                </Link>
              </li>
              <li>
                <Link href="/doacoes">
                  <span className="text-foreground/70 hover:text-primary transition-colors cursor-pointer">Doações</span>
                </Link>
              </li>
              <li>
                <a
                  href="https://app.conexa3.casadf.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/70 hover:text-primary transition-colors"
                >
                  Área do Colaborador
                </a>
              </li>
              <li>
                <Link href="/contato">
                  <span className="text-foreground/70 hover:text-primary transition-colors cursor-pointer">Contato</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Contato</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2 items-start">
                <Phone className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-foreground/70">(61) 3575-4125</p>
                  <p className="text-foreground/70">(61) 3575-4119</p>
                </div>
              </li>
              <li className="flex gap-2 items-start">
                <Mail className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <a href="mailto:contato@cocris.org" className="text-foreground/70 hover:text-primary transition-colors">
                  contato@cocris.org
                </a>
              </li>
              <li className="flex gap-2 items-start">
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-foreground/70">
                  Avenida Recanto das Emas<br />
                  Quadra 301, Lote 26<br />
                  Brasília-DF
                </p>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border my-8"></div>

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-foreground/60">
          <p>&copy; {currentYear} COCRIS - Associação Beneficente Coração de Cristo. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
            <a href="#" className="hover:text-primary transition-colors">Termos de Uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
