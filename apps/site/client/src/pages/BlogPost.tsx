import { Calendar, User, ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useParams } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { trpc } from '@/lib/trpc';

export default function BlogPost() {
  const params = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = trpc.blog.getPostBySlug.useQuery({ slug: params.slug || '' });

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
            <p className="text-destructive text-lg mb-6">Erro ao carregar o post.</p>
            <Link href="/blog">
              <button className="btn-primary inline-flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                Voltar para Blog
              </button>
            </Link>
          </div>
        )}

        {!post && !isLoading && !error && (
          <div className="container py-32 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">Post não encontrado</h2>
            <p className="text-foreground/70 mb-6">O post que você está procurando não existe ou foi removido.</p>
            <Link href="/blog">
              <button className="btn-primary inline-flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                Voltar para Blog
              </button>
            </Link>
          </div>
        )}

        {post && (
          <>
            {/* Hero Section */}
            {post.featuredImage && (
              <section className="relative h-[400px] md:h-[500px]">
                <img
                  src={post.featuredImage}
                  alt={post.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent"></div>
              </section>
            )}

            {/* Content Section */}
            <section className="py-20 md:py-32 bg-white">
              <div className="container">
                <article className="max-w-4xl mx-auto">
                  <Link href="/blog">
                    <button className="mb-8 inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
                      <ArrowLeft className="w-5 h-5" />
                      Voltar para Blog
                    </button>
                  </Link>

                  <h1 className="text-4xl md:text-5xl font-bold text-primary mb-6">{post.title}</h1>

                  <div className="flex items-center gap-6 text-foreground/60 mb-8 pb-8 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('pt-BR', { 
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      }) : 'Data não disponível'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      <span>COCRIS</span>
                    </div>
                  </div>

                  {post.excerpt && (
                    <div className="text-xl text-foreground/80 leading-relaxed mb-8 p-6 bg-muted rounded-xl">
                      {post.excerpt}
                    </div>
                  )}

                  <div className="prose prose-lg max-w-none">
                    <div className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </div>
                  </div>
                </article>
              </div>
            </section>

            {/* Related Posts */}
            <section className="py-20 md:py-32 bg-muted">
              <div className="container">
                <h2 className="text-3xl font-bold text-primary mb-12 text-center">Leia Também</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                  <div className="card-premium hover-lift hover-glow">
                    <h3 className="text-xl font-bold text-primary mb-3">Mais Notícias em Breve</h3>
                    <p className="text-foreground/70 mb-4">
                      Acompanhe nosso blog para mais histórias de impacto e novidades.
                    </p>
                    <Link href="/blog">
                      <button className="text-primary font-semibold hover:text-secondary transition-colors">
                        Ver Todas as Notícias →
                      </button>
                    </Link>
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
