import { Link } from 'react-router-dom'
import { tools } from '../data/tools.js'
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

export default function RelatedTools({ currentSlug, title = 'Related tools', max = 4 }) {
  const current = tools.find((t) => t.slug === currentSlug) ?? null
  const sameSection = current?.menuSection

  const candidates = tools
    .filter((t) => t.slug !== currentSlug)
    .filter((t) => (sameSection ? t.menuSection === sameSection : true))

  const pick = candidates.slice(0, max)

  if (!pick.length) return null

  return (
    <section className="serviceRelated">
      <div className="serviceRelatedHeader">
        <div className="serviceRelatedTitle">{title}</div>
        <div className="serviceRelatedDivider" aria-hidden="true" />
      </div>
      <div className="grid gridTight">
        {pick.map((tool) => {
          const to = tool.path ?? `/tools/${tool.slug}`
          const iconKey = iconKeyForTool(tool)
          return (
            <article key={tool.slug} className="card cardFancy cardRelated">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                  <span className={`toolIconBox toolIconBox--${iconKey}`} aria-hidden="true">
                    <ToolIcon name={iconKey} />
                  </span>
                  <div>
                    <div className="cardTitle" style={{ margin: 0 }}>{tool.title}</div>
                    <div className="muted" style={{ marginTop: 4 }}>{tool.description}</div>
                  </div>
                </div>
              </div>

              <div className="cardActions">
                <Link className="secondaryBtn" to={to}>
                  Open Tool
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
