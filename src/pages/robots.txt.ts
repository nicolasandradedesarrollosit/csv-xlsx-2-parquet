import type { APIRoute } from 'astro';

import { absUrl } from '../lib/seo';

export const GET: APIRoute = ({ site }) => {
  const body = `User-agent: *
Allow: /

Sitemap: ${absUrl('sitemap-index.xml', site)}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
