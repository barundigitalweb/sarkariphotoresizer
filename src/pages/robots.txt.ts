import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const robots = `User-agent: *
Disallow: /cdn-cgi/
Allow: /

Sitemap: https://sarkariphotoresizer.com/sitemap.xml
`;

  return new Response(robots, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    }
  });
};
