import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const pages = [
    { url: 'https://sarkariphotoresizer.com/', priority: '1.0', changefreq: 'daily' },
    { url: 'https://sarkariphotoresizer.com/about', priority: '0.8', changefreq: 'monthly' },
    { url: 'https://sarkariphotoresizer.com/privacy-policy', priority: '0.8', changefreq: 'monthly' },
    { url: 'https://sarkariphotoresizer.com/terms', priority: '0.8', changefreq: 'monthly' },
    { url: 'https://sarkariphotoresizer.com/disclaimer', priority: '0.8', changefreq: 'monthly' },
    { url: 'https://sarkariphotoresizer.com/contact', priority: '0.8', changefreq: 'monthly' }
  ];

  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `  <url>
    <loc>${p.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    }
  });
};
