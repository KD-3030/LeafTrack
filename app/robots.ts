import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/executive/', '/salesman/', '/api/', '/signup'],
    },
    sitemap: 'https://sohagtea.in/sitemap.xml',
    host: 'https://sohagtea.in',
  };
}
