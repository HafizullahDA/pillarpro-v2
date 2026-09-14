import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pillarpro.in'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/sign-in',
          '/sign-up',
          '/privacy',
          '/terms',
          '/icon.svg',
          '/manifest.json',
        ],
        disallow: [
          '/dashboard',
          '/projects',
          '/expenses',
          '/ra-bills',
          '/suppliers',
          '/muster-roll',
          '/partners',
          '/users',
          '/pending',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

