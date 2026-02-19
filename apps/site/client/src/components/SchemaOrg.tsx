import { useEffect } from 'react';

interface SchemaOrgProps {
  type?: 'Organization' | 'Article' | 'WebPage';
  data?: Record<string, any>;
}

export default function SchemaOrg({ type = 'Organization', data = {} }: SchemaOrgProps) {
  useEffect(() => {
    const getSchemaData = () => {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

      if (type === 'Organization') {
        return {
          '@context': 'https://schema.org',
          '@type': 'NGO',
          name: 'COCRIS - Associação Beneficente Coração de Cristo',
          alternateName: 'COCRIS',
          url: baseUrl,
          logo: `${baseUrl}/images/logo.png`,
          description: 'Organização sem fins lucrativos dedicada à educação infantil de excelência no Distrito Federal',
          foundingDate: '2009',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Avenida Recanto das Emas, Quadra 301, Lote 26',
            addressLocality: 'Recanto das Emas',
            addressRegion: 'DF',
            postalCode: '72620214',
            addressCountry: 'BR',
          },
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+55-61-3575-4125',
            contactType: 'customer service',
            areaServed: 'BR',
            availableLanguage: 'Portuguese',
          },
          sameAs: [
            'https://www.facebook.com/cocris',
            'https://www.instagram.com/cocris',
          ],
          ...data,
        };
      }

      if (type === 'Article') {
        return {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: data.title || '',
          description: data.description || '',
          image: data.image || '',
          datePublished: data.publishedAt || new Date().toISOString(),
          dateModified: data.updatedAt || new Date().toISOString(),
          author: {
            '@type': 'Organization',
            name: 'COCRIS',
          },
          publisher: {
            '@type': 'Organization',
            name: 'COCRIS',
            logo: {
              '@type': 'ImageObject',
              url: `${baseUrl}/images/logo.png`,
            },
          },
          ...data,
        };
      }

      if (type === 'WebPage') {
        return {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: data.title || 'COCRIS',
          description: data.description || '',
          url: typeof window !== 'undefined' ? window.location.href : '',
          ...data,
        };
      }

      return {};
    };

    const schemaData = getSchemaData();
    
    // Remove existing schema script if any
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new schema script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.querySelector('script[type="application/ld+json"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [type, data]);

  return null;
}
