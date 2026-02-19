import { getDb } from './db';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * Gerar sitemap.xml dinâmico
 */
export async function generateSitemap(baseUrl: string): Promise<string> {
  const urls: SitemapUrl[] = [];
  const now = new Date().toISOString();

  // Páginas estáticas
  const staticPages = [
    { loc: '/', changefreq: 'daily' as const, priority: 1.0 },
    { loc: '/quem-somos', changefreq: 'monthly' as const, priority: 0.8 },
    { loc: '/unidades', changefreq: 'weekly' as const, priority: 0.9 },
    { loc: '/projetos', changefreq: 'weekly' as const, priority: 0.8 },
    { loc: '/blog', changefreq: 'daily' as const, priority: 0.9 },
    { loc: '/doacoes', changefreq: 'monthly' as const, priority: 0.9 },
    { loc: '/transparencia', changefreq: 'monthly' as const, priority: 0.7 },
    { loc: '/compliance', changefreq: 'yearly' as const, priority: 0.6 },
    { loc: '/contato', changefreq: 'monthly' as const, priority: 0.7 },
  ];

  staticPages.forEach(page => {
    urls.push({
      loc: `${baseUrl}${page.loc}`,
      lastmod: now,
      changefreq: page.changefreq,
      priority: page.priority,
    });
  });

  try {
    const db = await getDb();
    if (!db) {
      console.warn('[Sitemap] Database not available, generating static sitemap only');
      return generateXML(urls);
    }

    // Buscar unidades ativas
    const units = await db.$client.execute('SELECT slug, updatedAt FROM units WHERE active = true');
    if (units && Array.isArray(units) && units.length > 0) {
      units.forEach((unit: any) => {
        urls.push({
          loc: `${baseUrl}/unidades/${unit.slug}`,
          lastmod: unit.updatedAt ? new Date(unit.updatedAt).toISOString() : now,
          changefreq: 'monthly',
          priority: 0.7,
        });
      });
    }

    // Buscar posts do blog publicados
    const posts = await db.$client.execute(
      'SELECT slug, updatedAt FROM blogPosts WHERE published = true ORDER BY publishedAt DESC LIMIT 100'
    );
    if (posts && Array.isArray(posts) && posts.length > 0) {
      posts.forEach((post: any) => {
        urls.push({
          loc: `${baseUrl}/blog/${post.slug}`,
          lastmod: post.updatedAt ? new Date(post.updatedAt).toISOString() : now,
          changefreq: 'weekly',
          priority: 0.6,
        });
      });
    }

    // Buscar projetos ativos
    const projects = await db.$client.execute('SELECT slug, updatedAt FROM projects WHERE active = true');
    if (projects && Array.isArray(projects) && projects.length > 0) {
      projects.forEach((project: any) => {
        urls.push({
          loc: `${baseUrl}/projetos/${project.slug}`,
          lastmod: project.updatedAt ? new Date(project.updatedAt).toISOString() : now,
          changefreq: 'monthly',
          priority: 0.7,
        });
      });
    }
  } catch (error) {
    console.error('[Sitemap] Error fetching dynamic URLs:', error);
  }

  return generateXML(urls);
}

/**
 * Gerar XML do sitemap
 */
function generateXML(urls: SitemapUrl[]): string {
  const urlEntries = urls
    .map(url => {
      return `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority !== undefined ? `<priority>${url.priority}</priority>` : ''}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

/**
 * Escapar caracteres especiais XML
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
