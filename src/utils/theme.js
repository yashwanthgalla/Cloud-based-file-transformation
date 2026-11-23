const STORAGE_KEY = 'theme'

export function getPreferredTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
  return prefersDark ? 'dark' : 'light'
}

export function applyTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light'
  const root = document.documentElement
  root.classList.toggle('dark', t === 'dark')
  localStorage.setItem(STORAGE_KEY, t)
  return t
}

export function toggleTheme() {
  const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  return applyTheme(current === 'dark' ? 'light' : 'dark')
}
