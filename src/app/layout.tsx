import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { LanguageProvider } from '@/components/language-provider'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://meal-hisab-sigma.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: 'MealHisab BD', template: '%s | MealHisab BD' },
  description: 'Simple, fair meal accounting for Bangladeshi flats and messes.',
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_BD',
    url: '/',
    siteName: 'MealHisab BD',
    title: 'MealHisab BD',
    description: 'Simple, fair meal accounting for Bangladeshi flats and messes.',
  },
  twitter: {
    card: 'summary',
    title: 'MealHisab BD',
    description: 'Simple, fair meal accounting for Bangladeshi flats and messes.',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script src="/theme-init.js" /></head>
      <body>
        <LanguageProvider>
          {children}
          <Toaster position="top-right" richColors closeButton theme="system" />
        </LanguageProvider>
      </body>
    </html>
  )
}
