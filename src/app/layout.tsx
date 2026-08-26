import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { LanguageProvider } from '@/components/language-provider'

export const metadata: Metadata = {
  title: { default: 'MealHisab BD', template: '%s | MealHisab BD' },
  description: 'Simple, fair meal accounting for Bangladeshi flats and messes.',
  manifest: '/manifest.webmanifest',
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
