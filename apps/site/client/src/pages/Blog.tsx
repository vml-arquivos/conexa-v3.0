import { Search, Calendar, User, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { trpc } from '@/lib/trpc';

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: posts, isLoading } = trpc.blog.getPosts.useQuery({ limit: 12, offset: 0 });
  const { data: categories } = trpc.blog.getCategories.useQuery();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary via-primary/90 to-secondary py-20 md:py-32">
          <div className="container text-white text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Blog e Notícias</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8">
              Acompanhe nossas histórias de impacto, eventos e novidades sobre educação infantil
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/50" />
                <input
                  type="text"
                  placeholder="Buscar notícias..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-lg text-foreground focus:ring-2 focus:ring-white"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Blog Content */}
        <section className="py-20 md:py-32 bg-white">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
              {/* Sidebar */}
              <aside className="lg:col-span-1">
                <div className="card-premium sticky top-24">
                  <h3 className="text-xl font-bold text-primary mb-4">Categorias</h3>
                  {categories && categories.length > 0 ? (
                    <ul className="space-y-2">
                      {categories.map((category) => (
                        <li key={category.id}>
                          <a
                            href={`#${category.slug}`}
                            className="text-foreground/70 hover:text-primary transition-colors block py-2"
                          >
                            {category.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-foreground/50 text-sm">Nenhuma categoria disponível</p>
                  )}
                </div>
              </aside>

              {/* Posts Grid */}
              <div className="lg:col-span-3">
                {isLoading && (
                  <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  </div>
                )}

                {posts && posts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {posts.map((post) => (
                      <article key={post.id} className="card-premium hover-lift hover-glow group">
                        {/* Post Image */}
                        {post.featuredImage && (
                          <div className="relative h-48 mb-6 -mx-6 -mt-6 rounded-t-xl overflow-hidden">
                            <img
                              src={post.featuredImage}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}

                        {/* Post Content */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 text-sm text-foreground/60">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('pt-BR') : 'Data não disponível'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>COCRIS</span>
                            </div>
                          </div>

                          <h2 className="text-2xl font-bold text-primary group-hover:text-secondary transition-colors">
                            {post.title}
                          </h2>

                          {post.excerpt && (
                            <p className="text-foreground/70 line-clamp-3">
                              {post.excerpt}
                            </p>
                          )}

                          <Link href={`/blog/${post.slug}`}>
                            <button className="text-primary font-semibold hover:text-secondary transition-colors inline-flex items-center gap-1">
                              Ler mais
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : !isLoading && (
                  <div className="text-center py-20">
                    <p className="text-foreground/70 text-lg">Nenhuma notícia disponível no momento.</p>
                    <p className="text-foreground/50 text-sm mt-2">Em breve publicaremos novos conteúdos!</p>
                  </div>
                )}

                {/* Pagination */}
                {posts && posts.length > 0 && (
                  <div className="flex justify-center gap-2 mt-12">
                    <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                      Anterior
                    </button>
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                      1
                    </button>
                    <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                      2
                    </button>
                    <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                      Próxima
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-20 md:py-32 bg-gradient-to-r from-primary to-secondary text-white">
          <div className="container text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Receba Nossas Notícias</h2>
            <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
              Inscreva-se em nossa newsletter e fique por dentro de todas as novidades
            </p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
              <input
                type="email"
                placeholder="Seu melhor email"
                className="flex-1 px-6 py-4 rounded-lg text-foreground focus:ring-2 focus:ring-white"
                required
              />
              <button type="submit" className="px-8 py-4 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-all">
                Inscrever-se
              </button>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
