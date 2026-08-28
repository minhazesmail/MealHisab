import type { MetadataRoute } from 'next'

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://meal-hisab-sigma.vercel.app').replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/demo', '/account-type', '/login'],
      disallow: [
        '/dashboard',
        '/activity',
        '/calendar',
        '/contributions',
        '/expenses',
        '/meals',
        '/reports',
        '/settings',
        '/settlements',
        '/billing',
        '/admin',
        '/manager',
        '/onboarding',
        '/invites',
        '/join/',
        '/api/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
