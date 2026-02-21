import { useState, useEffect } from 'react';
import { Menu, X, ExternalLink, Heart } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setIsOpen(false); }, [location]);

  const navLinks = [
    { label: 'Início', href: '/' },
    { label: 'Sobre Nós', href: '/quem-somos' },
    { label: 'CEPIs e Creches', href: '/unidades' },
    { label: 'Projetos', href: '/projetos' },
    { label: 'Notícias', href: '/blog' },
    { label: 'Transparência', href: '/transparencia' },
    { label: 'Trabalhe Conosco', href: '/trabalhe-conosco' },
    { label: 'Contato', href: '/contato' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 bg-white border-b border-border transition-shadow duration-300 ${
        scrolled ? 'shadow-md' : 'shadow-sm'
      }`}
    >
      <div className="container flex items-center justify-between h-20">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer">
            <img
              src="/images/logo-cocris.png"
              alt="COCRIS - Associação Beneficente Coração de Cristo"
              className="h-12 w-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="flex flex-col">
              <span className="text-primary font-bold text-base leading-tight">COCRIS</span>
              <span className="text-xs text-muted-foreground font-medium">Educação Infantil</span>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <span
                className={`text-sm font-semibold transition-colors duration-200 relative group cursor-pointer ${
                  location === link.href ? 'text-primary' : 'text-foreground hover:text-primary'
                }`}
              >
                {link.label}
                <span
                  className={`absolute -bottom-0.5 left-0 h-0.5 bg-primary transition-all duration-300 ${
                    location === link.href ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                />
              </span>
            </Link>
          ))}
        </nav>

        {/* CTA Buttons — Desktop */}
        <div className="hidden md:flex items-center gap-2">
          <a
            href="https://app.conexa3.casadf.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 border-2 border-primary text-primary text-xs font-semibold rounded-lg hover:bg-primary hover:text-white transition-all duration-200"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Área do Colaborador
          </a>
          <Link href="/doacoes">
            <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md">
              <Heart className="w-3.5 h-3.5" />
              Fazer Doação
            </button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="xl:hidden p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-primary" />
          ) : (
            <Menu className="w-6 h-6 text-primary" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <nav className="xl:hidden bg-white border-t border-border shadow-lg">
          <div className="container py-4 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    location === link.href
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground hover:bg-muted hover:text-primary'
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
            <div className="pt-4 mt-2 border-t border-border space-y-2 px-1">
              <a
                href="https://app.conexa3.casadf.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-primary text-primary text-sm font-semibold rounded-xl hover:bg-primary hover:text-white transition-all duration-200"
              >
                <ExternalLink className="w-4 h-4" />
                Área do Colaborador
              </a>
              <Link href="/doacoes">
                <button className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200">
                  <Heart className="w-4 h-4" />
                  Fazer Doação
                </button>
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
