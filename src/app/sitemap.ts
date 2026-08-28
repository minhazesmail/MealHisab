import type { MetadataRoute } from 'next'

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://meal-hisab-sigma.vercel.app').replace(/\/$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/demo`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/account-type`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  return routes
}
