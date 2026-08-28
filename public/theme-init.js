(() => {
  try {
    const savedTheme = localStorage.getItem('mealhisab-theme')
    const theme = savedTheme === 'light' || savedTheme === 'dark'
      ? savedTheme
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    const root = document.documentElement
    root.dataset.theme = theme
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme

    const savedLocale = localStorage.getItem('mealhisab-locale')
    const locale = savedLocale === 'en' || savedLocale === 'bn'
      ? savedLocale
      : ((navigator.language || '').toLowerCase().startsWith('bn') ? 'bn' : 'en')
    root.lang = locale
  } catch {}
})()
