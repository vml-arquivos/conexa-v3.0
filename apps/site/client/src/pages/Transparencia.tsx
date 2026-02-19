import { FileText, Download } from 'lucide-react';
import { Link } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const documentsByCategory = {
  'Financeiro': [
    { title: 'Balanço Patrimonial 2024', date: 'Janeiro 2025', category: 'Financeiro', url: '#' },
    { title: 'Demonstração de Resultados 2024', date: 'Janeiro 2025', category: 'Financeiro', url: '#' },
    { title: 'Fluxo de Caixa 2024', date: 'Janeiro 2025', category: 'Financeiro', url: '#' },
    { title: 'Balanço Patrimonial 2023', date: 'Janeiro 2024', category: 'Financeiro', url: '#' },
  ],
  'Auditoria': [
    { title: 'Parecer de Auditoria Independente 2024', date: 'Fevereiro 2025', category: 'Auditoria', url: '#' },
    { title: 'Relatório de Auditoria Interna 2024', date: 'Dezembro 2024', category: 'Auditoria', url: '#' },
    { title: 'Parecer de Auditoria 2023', date: 'Fevereiro 2024', category: 'Auditoria', url: '#' },
  ],
  'Institucional': [
    { title: 'Estatuto Social Atualizado', date: 'Permanente', category: 'Institucional', url: '#' },
    { title: 'Ata de Fundação', date: 'Permanente', category: 'Institucional', url: '#' },
    { title: 'CNPJ e Inscrições', date: 'Permanente', category: 'Institucional', url: '#' },
    { title: 'Certidões de Regularidade', date: 'Atualizado Mensalmente', category: 'Institucional', url: '#' },
  ],
  'Planos e Relatórios': [
    { title: 'Relatório de Atividades 2024', date: 'Janeiro 2025', category: 'Relatórios', url: '#' },
    { title: 'Plano de Trabalho 2025', date: 'Dezembro 2024', category: 'Relatórios', url: '#' },
    { title: 'Relatório de Impacto Social 2024', date: 'Janeiro 2025', category: 'Relatórios', url: '#' },
    { title: 'Plano Pedagógico 2025', date: 'Janeiro 2025', category: 'Relatórios', url: '#' },
  ],
  'Governança': [
    { title: 'Composição da Diretoria', date: 'Atualizado', category: 'Governança', url: '#' },
    { title: 'Política de Conflito de Interesses', date: 'Permanente', category: 'Governança', url: '#' },
    { title: 'Código de Ética e Conduta', date: 'Permanente', category: 'Governança', url: '#' },
    { title: 'Política de Proteção de Dados (LGPD)', date: 'Permanente', category: 'Governança', url: '#' },
  ],
};

export default function Transparencia() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="bg-gradient-to-r from-primary/10 to-secondary/10 py-12 md:py-16">
          <div className="container">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Transparência
            </h1>
            <p className="text-lg text-foreground/70 max-w-2xl">
              Acesse todos os documentos e relatórios da COCRIS. Operamos com total transparência e prestação de contas.
            </p>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-white">
          <div className="container">
            <div className="mb-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                Documentos Públicos
              </h2>
              <p className="text-lg text-foreground/70 max-w-3xl mx-auto">
                A COCRIS opera com total transparência. Todos os nossos documentos financeiros, relatórios de auditoria e documentos institucionais estão disponíveis para consulta pública.
              </p>
            </div>

            {Object.entries(documentsByCategory).map(([category, docs]) => (
              <div key={category} className="mb-12">
                <h3 className="text-2xl font-bold text-primary mb-6 border-b-2 border-primary/20 pb-2">
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {docs.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.url}
                      className="card-cocris flex items-center justify-between hover:shadow-lg transition-shadow"
                    >
                      <div className="flex gap-4 items-start flex-1">
                        <FileText className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                        <div>
                          <h4 className="font-semibold text-foreground">{doc.title}</h4>
                          <p className="text-sm text-foreground/60">{doc.date}</p>
                        </div>
                      </div>
                      <Download className="w-5 h-5 text-primary flex-shrink-0 ml-4" />
                    </a>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-16 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold text-primary mb-4">
                Solicitação de Informações
              </h3>
              <p className="text-foreground/70 mb-6 max-w-2xl mx-auto">
                Não encontrou o documento que procura? Entre em contato conosco e teremos prazer em atendê-lo.
              </p>
              <Link href="/contato">
                <button className="btn-primary">
                  Entrar em Contato
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
