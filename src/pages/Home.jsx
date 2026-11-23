import { Link } from 'react-router-dom'
import { tools } from '../data/tools.js'
import { readRecentTools } from '../utils/recentTools.js'
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
} from 'lucide-react'

const MOST_USED_SLUGS = new Set(['merge-pdf', 'split-pdf', 'compress-pdf', 'word-to-pdf', 'pdf-to-word'])

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

function ToolIcon({ name }) {
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

function groupForHome(list) {
  const mostUsed = []
  const convert = []
  const editOrganize = []
  const exportOptimize = []
  const security = []

  for (const t of list) {
    if (MOST_USED_SLUGS.has(t.slug)) {
      mostUsed.push(t)
      continue
    }

    const section = t.menuSection
    if (section === 'CONVERT_TO_PDF' || section === 'CONVERT_FROM_PDF') {
      convert.push(t)
    } else if (section === 'EDIT_PDF' || section === 'ORGANIZE_PDF') {
      editOrganize.push(t)
    } else if (section === 'OPTIMIZE_PDF') {
      exportOptimize.push(t)
    } else if (section === 'PDF_SECURITY') {
      security.push(t)
    } else {
      exportOptimize.push(t)
    }
  }

  return [
    { key: 'most', title: 'Most used', subtitle: 'Start here — the essentials.', tools: mostUsed },
    { key: 'convert', title: 'Convert PDFs', subtitle: 'Move between PDF and popular formats.', tools: convert },
    { key: 'edit', title: 'Edit & organize', subtitle: 'Tidy, annotate, and restructure pages.', tools: editOrganize },
    { key: 'opt', title: 'Export & compress', subtitle: 'Optimize size, OCR, repair, and more.', tools: exportOptimize },
    { key: 'sec', title: 'Security', subtitle: 'Protect, unlock, and handle sensitive docs.', tools: security },
  ].filter((s) => s.tools.length)
}

function timeAgo(ms) {
  if (!Number.isFinite(ms)) return ''
  const diff = Date.now() - ms
  if (diff < 60_000) return 'just now'
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function Home() {
  const recent = readRecentTools()
  const last = recent[0]
  const sections = groupForHome(tools)

  return (
    <div className="stack home">
      <section className="hero">
        <div className="homeHeroPanel">
          <div className="homeHeroText">
            <h1 className="homeHeroTitle">All your PDF tools. One fast workspace.</h1>
            <p className="homeHeroSubtitle">
              Merge, split, compress, and convert PDFs — with clear steps and privacy-first defaults.
            </p>

            <div className="homeHeroCtas">
              <Link className="primaryBtn" to="/merge">
                Start with Merge PDF
              </Link>
              <Link className="secondaryBtn" to="/split">
                Split PDF
              </Link>
              <Link className="secondaryBtn" to="/compress">
                Compress PDF
              </Link>
            </div>

            <div className="trustRow" aria-label="Trust signals">
              <span className="trustPill">Privacy-first</span>
              <span className="trustPill">Most tools run in your browser</span>
              <span className="trustPill">Server tools are clearly labeled</span>
            </div>
          </div>

          <aside className="homeHeroSide" aria-label="Dashboard">
            <div className="miniPanel">
              <div className="miniTitle">Recently used</div>
              {recent.length ? (
                <div className="chipRow">
                  {recent.slice(0, 5).map((t) => (
                    <Link key={t.slug} className="chip" to={t.path} title={t.title}>
                      {t.title}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="muted">No recent tools yet.</div>
              )}
              {last?.at ? <div className="muted">Last used: {timeAgo(last.at)}</div> : null}
            </div>

            <div className="miniPanel">
              <div className="miniTitle">Quick actions</div>
              <div className="quickActions">
                <Link className="secondaryBtn" to="/word-to-pdf">
                  Word → PDF
                </Link>
                <Link className="secondaryBtn" to="/pdf-to-jpg">
                  PDF → JPG
                </Link>
                <Link className="secondaryBtn" to="/protect">
                  Protect PDF
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.key} className="toolSection">
          <div className="sectionHeader">
            <div>
              <h2 className="sectionTitle">{section.title}</h2>
              <p className="sectionSubtitle">{section.subtitle}</p>
            </div>
            <div className="sectionDivider" aria-hidden="true" />
          </div>

          <div className="grid gridTight">
            {section.tools.map((tool) => {
              const to = tool.path ?? `/tools/${tool.slug}`
              const iconKey = iconKeyForTool(tool)
              const buttonText = tool.status === 'ready' ? 'Open Tool' : 'View Tool'

              return (
                <article key={tool.slug} className="card cardFancy">
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                      <span className={`toolIconBox toolIconBox--${iconKey}`} aria-hidden="true">
                        <ToolIcon name={iconKey} />
                      </span>
                      <h3 className="cardTitle" style={{ margin: 0 }}>{tool.title}</h3>
                    </div>
                    {tool.isNew ? <span className="badge">New</span> : null}
                  </div>

                  <p className="cardBody">{tool.description}</p>

                  <div className="cardActions">
                    <Link className="primaryBtn" to={to}>
                      {buttonText}
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ))}

      <section className="homeFooterNote">
        <div className="panel homeNotePanel">
          <div className="noteTitle">Trust & privacy</div>
          <div className="noteBody">
            Most tools run locally in your browser. Some conversions and advanced operations run on your server
            (for example Office → PDF) and require LibreOffice installed.
          </div>
        </div>
      </section>
    </div>
  )
}
