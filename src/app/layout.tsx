import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/components/language-provider'

export const metadata: Metadata = {
  title: { default: 'MealHisab BD', template: '%s | MealHisab BD' },
  description: 'Simple, fair meal accounting for Bangladeshi flats and messes.',
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}
