function ensureFaviconLink() {
  let link = document.querySelector('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  return link
}

const DEFAULT_FAVICON_PNG = '/smurfs/smurf-22587.png'

function svgToDataUrl(svg) {
  const encoded = encodeURIComponent(svg)
    .replace(/%0A/g, '')
    .replace(/%20/g, ' ')
    .replace(/%3D/g, '=')
    .replace(/%3A/g, ':')
    .replace(/%2F/g, '/')

  return `data:image/svg+xml,${encoded}`
}

function cssVar(name, fallback) {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return value || fallback
  } catch {
    return fallback
  }
}

function shortCodeFromTitle(title) {
  const raw = String(title || '').trim()
  if (!raw) return 'DP'

  const stop = new Set(['pdf', 'to', 'and', '&'])
  const words = raw
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .filter((w) => !stop.has(w.toLowerCase()))

  if (words.length === 0) return 'DP'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()

  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

function badgeSvg({ label, bg, accent, text }) {
  const safe = String(label || '').slice(0, 3).toUpperCase()
  const fontSize = safe.length === 1 ? 28 : safe.length === 2 ? 22 : 18

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="${bg}"/>
  <rect x="10" y="10" width="44" height="44" rx="14" fill="${accent}"/>
  <text x="32" y="38" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="${fontSize}" font-weight="800" fill="${text}">${safe}</text>
</svg>`
}

export function resetFaviconToDefault() {
  const link = ensureFaviconLink()
  link.type = 'image/png'
  link.href = DEFAULT_FAVICON_PNG
}

export function setFaviconForServiceTitle(title) {
  const link = ensureFaviconLink()
  // Keep a consistent Smurf icon across routes (requested).
  // `title` is intentionally unused.
  link.type = 'image/png'
  link.href = DEFAULT_FAVICON_PNG
}
