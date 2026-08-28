import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { LanguageProvider } from '@/components/language-provider'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://meal-hisab-sigma.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: 'MealHisab BD', template: '%s | MealHisab BD' },
  description: 'Simple, fair meal accounting for Bangladeshi flats and messes.',
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'MealHisab BD',
    locale: 'en_BD',
    title: 'MealHisab BD',
    description: 'Simple, fair meal accounting for Bangladeshi flats and messes.',
  },
  twitter: {
    card: 'summary',
    title: 'MealHisab BD',
    description: 'Simple, fair meal accounting for Bangladeshi flats and messes.',
  },
}

const themeScript = `(() => {
  try {
    const saved = localStorage.getItem('mealhisab-theme');
    const theme = saved === 'light' || saved === 'dark'
      ? saved
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  } catch {}
})();`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <LanguageProvider>
          {children}
          <Toaster position="top-right" richColors closeButton theme="system" />
        </LanguageProvider>
      </body>
    </html>
  )
}
