import type {MetadataRoute} from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://buenserv.com';
  return {rules: [{userAgent: '*', allow: '/', disallow: ['/admin', '/api']}], sitemap: `${base}/sitemap.xml`};
}
