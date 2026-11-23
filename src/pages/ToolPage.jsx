import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getToolBySlug } from '../data/tools.js'
import ServicePage from '../components/ServicePage.jsx'

export default function ToolPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const tool = getToolBySlug(slug)

  if (!tool) return <Navigate to="/" replace />
  if (tool.path && tool.path !== `/tools/${slug}`) {
    return <Navigate to={tool.path} replace />
  }

  return (
    <ServicePage
      slug={tool.slug}
      title={tool.title}
      subtitle={tool.description}
      trust={['Premium layout', 'Consistent steps', 'More tools below']}
      primaryActionLabel="Back to all tools"
      onPrimaryAction={() => navigate('/')}
      related
      relatedTitle="Explore related tools"
    >
      <div className="stack">
        <div>
          <strong>Status:</strong> {tool.status === 'ready' ? 'Ready' : 'Coming soon'}
        </div>
        <div className="muted">This tool page is wired up, but the feature isn’t implemented yet.</div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Link className="navLink" to="/merge">
            Try Merge PDF
          </Link>
          <Link className="navLink" to="/compress">
            Try Compress PDF
          </Link>
        </div>
      </div>
    </ServicePage>
  )
}
