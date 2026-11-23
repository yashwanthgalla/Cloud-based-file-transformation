import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { tools } from '../data/tools.js'
import { logout as localLogout, me as localMe } from '../utils/localAuth.js'
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode2,
  Presentation,
  Lock,
  Pencil,
  Layers,
  Sparkles,
  ArrowLeftRight,
  Moon,
  Sun,
} from 'lucide-react'
import { toggleTheme } from '../utils/theme.js'

function groupBy(items, keyFn) {
  const map = new Map()
  for (const item of items) {
    const key = keyFn(item)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  }
  return map
}

function useOutsideClick(ref, handler, enabled) {
  useEffect(() => {
    if (!enabled) return
    function onMouseDown(event) {
      const el = ref.current
      if (!el) return
      if (el.contains(event.target)) return
      handler()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [enabled, handler, ref])
}

function iconKeyForTool(tool) {
  const bySlug = {
    'jpg-to-pdf': 'jpg',
    'pdf-to-jpg': 'jpg',
    'word-to-pdf': 'doc',
    'pdf-to-word': 'doc',
    'powerpoint-to-pdf': 'ppt',
    'pdf-to-powerpoint': 'ppt',
    'excel-to-pdf': 'xls',
    'pdf-to-excel': 'xls',
    'html-to-pdf': 'html',
    'pdf-to-pdfa': 'pdfa',
  }
  if (bySlug[tool.slug]) return bySlug[tool.slug]

  const section = tool.menuSection
  if (section === 'ORGANIZE_PDF') return 'organize'
  if (section === 'OPTIMIZE_PDF') return 'optimize'
  if (section === 'EDIT_PDF') return 'edit'
  if (section === 'PDF_SECURITY') return 'security'
  if (section === 'CONVERT_TO_PDF') return 'convert'
  if (section === 'CONVERT_FROM_PDF') return 'convert'

  return 'tool'
}

function MenuIcon({ name }) {
  const props = { size: 18, strokeWidth: 2, 'aria-hidden': true }
  if (name === 'jpg') return <FileImage {...props} />
  if (name === 'doc') return <FileText {...props} />
  if (name === 'ppt') return <Presentation {...props} />
  if (name === 'xls') return <FileSpreadsheet {...props} />
  if (name === 'html') return <FileCode2 {...props} />
  if (name === 'pdfa') return <FileText {...props} />

  if (name === 'organize') return <Layers {...props} />
  if (name === 'optimize') return <Sparkles {...props} />
  if (name === 'edit') return <Pencil {...props} />
  if (name === 'security') return <Lock {...props} />
  if (name === 'convert') return <ArrowLeftRight {...props} />

  return <ArrowLeftRight {...props} />
}

function MenuItem({ tool, onSelect }) {
  const key = iconKeyForTool(tool)
  return (
    <Link
      key={tool.slug}
      className="menuItem menuItemRow"
      to={tool.path ?? `/tools/${tool.slug}`}
      onClick={onSelect}
    >
      <span className={`menuIconBox menuIconBox--${key}`} aria-hidden="true">
        <MenuIcon name={key} />
      </span>
      <span className="menuItemText">{tool.title}</span>
    </Link>
  )
}

export default function Header() {
  const [open, setOpen] = useState(null) // 'convert' | 'all' | null
  const rootRef = useRef(null)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useOutsideClick(rootRef, () => setOpen(null), open !== null)

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const convertTo = useMemo(() => tools.filter((t) => t.menuSection === 'CONVERT_TO_PDF'), [])
  const convertFrom = useMemo(() => tools.filter((t) => t.menuSection === 'CONVERT_FROM_PDF'), [])

  const allToolsSections = useMemo(() => {
    const visible = tools.filter((t) => t.showInAllToolsMenu)
    const grouped = groupBy(visible, (t) => t.allToolsSection)

    const sectionOrder = [
      'ORGANIZE PDF',
      'OPTIMIZE PDF',
      'CONVERT TO PDF',
      'CONVERT FROM PDF',
      'EDIT PDF',
      'PDF SECURITY',
    ]

    return sectionOrder
      .filter((s) => grouped.has(s))
      .map((s) => [s, grouped.get(s)])
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadMe() {
      setAuthLoading(true)
      try {
        if (cancelled) return
        const data = await localMe()
        if (cancelled) return
        setUser(data?.user ?? null)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    }

    loadMe()
    return () => {
      cancelled = true
    }
  }, [location.key])

  async function logout() {
    try {
      await localLogout()
    } finally {
      setUser(null)
      navigate('/')
    }
  }

  function toggle(which) {
    setOpen((prev) => (prev === which ? null : which))
  }

  return (
    <header className="topbar" ref={rootRef}>
      <div className="container topbarInner">
        <div className="leftNav">
          <Link className="brand" to="/">
            <img className="brandMark" src="/smurfs/smurf-22587.png" alt="" />
            <span className="brandDammy">Dammy</span>
            <span className="brandPdf">PDF</span>
          </Link>
          <nav className="nav">
            <div className="dropdown">
              <button
                type="button"
                className="navLink navButton"
                aria-haspopup="menu"
                aria-expanded={open === 'convert'}
                onClick={() => toggle('convert')}
              >
                Convert PDF
              </button>
              {open === 'convert' ? (
                <div className="menuPanel menuPanelConvert" role="menu">
                  <div className="menuScroller">
                    <div className="menuGrid2 menuGridConvert">
                      <div className="menuCol">
                        <div className="menuTitle">CONVERT TO PDF</div>
                        {convertTo.map((t) => (
                          <MenuItem key={t.slug} tool={t} onSelect={() => setOpen(null)} />
                        ))}
                      </div>
                      <div className="menuCol">
                        <div className="menuTitle">CONVERT FROM PDF</div>
                        {convertFrom.map((t) => (
                          <MenuItem key={t.slug} tool={t} onSelect={() => setOpen(null)} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="dropdown">
              <button
                type="button"
                className="navLink navButton"
                aria-haspopup="menu"
                aria-expanded={open === 'all'}
                onClick={() => toggle('all')}
              >
                All PDF Tools
              </button>
              {open === 'all' ? (
                <div className="menuPanel menuPanelAll" role="menu">
                  <div className="menuScroller">
                    <div className="menuGrid6 menuGridAll">
                      {allToolsSections.map(([section, sectionTools]) => (
                        <div key={section} className="menuCol">
                          <div className="menuTitle">{section}</div>
                          {sectionTools.map((t) => (
                            <MenuItem key={t.slug} tool={t} onSelect={() => setOpen(null)} />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="navScroll" aria-label="Quick tools">
              <Link className="navLink navLinkQuick" to="/merge">
                Merge PDF
              </Link>
              <Link className="navLink navLinkQuick" to="/split">
                Split PDF
              </Link>
              <Link className="navLink navLinkQuick" to="/compress">
                Compress PDF
              </Link>
            </div>
          </nav>
        </div>

        <div className="authNav">
          <button
            type="button"
            className="navLink navButton"
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => {
              const next = toggleTheme()
              setIsDark(next === 'dark')
            }}
          >
            {isDark ? <Sun size={18} strokeWidth={2} aria-hidden="true" /> : <Moon size={18} strokeWidth={2} aria-hidden="true" />}
          </button>

          {authLoading ? (
            <span className="muted authUser">Loading…</span>
          ) : user ? (
            <>
              <span className="muted authUser" title={user.email}>
                {user.email}
              </span>
              <button type="button" className="navLink navButton" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className="navLink" to="/login">
                Login
              </Link>
              <Link className="primaryBtn smallBtn" to="/signup">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
