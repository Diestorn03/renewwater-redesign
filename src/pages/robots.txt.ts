import type { APIRoute } from 'astro';

// PUBLIC_DEMO=1 (GitHub Pages proposal build): keep the demo out of search results so it never competes with renewwaterus.com.
export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const body = import.meta.env.PUBLIC_DEMO
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nSitemap: ${site?.origin ?? ''}${base}/sitemap-index.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
};
