import StarBorder from './StarBorder.jsx'
import FileDropzone from './FileDropzone.jsx'
import RelatedTools from './RelatedTools.jsx'

function asArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export default function ServicePage({
  slug,
  title,
  subtitle,
  helper,
  trust,

  dropzone,

  accept,
  multiple = false,
  dropTitle,
  dropHint,
  onFiles,

  isWorking = false,

  actionLeft,
  primaryActionLabel,
  primaryActionWorkingLabel,
  onPrimaryAction,
  primaryDisabled,
  meta,

  feedback,
  children,
  preview,

  related = true,
  relatedTitle = 'Related tools',
}) {
  const trustItems = asArray(trust)

  return (
    <div className="stack servicePage">
      <section className="hero serviceHero">
        <div className="serviceHeroPanel">
          <div className="serviceHeroMain">
            <div className="serviceKicker">PDF tool</div>
            <h1 className="serviceTitle">{title}</h1>
            {subtitle ? <p className="serviceSubtitle">{subtitle}</p> : null}
            {helper ? <div className="serviceHelper muted">{helper}</div> : null}

            {trustItems.length ? (
              <div className="trustRow" aria-label="Trust indicators">
                {trustItems.map((t) => (
                  <span key={t} className="trustPill">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel stack serviceZone">
        {dropzone ? (
          dropzone
        ) : typeof onFiles === 'function' ? (
          <FileDropzone
            accept={accept}
            multiple={multiple}
            title={dropTitle}
            hint={dropHint}
            disabled={isWorking}
            onFiles={onFiles}
          />
        ) : null}

        <div className="row toolActionsRow serviceActions" style={{ flexWrap: 'wrap' }}>
          {actionLeft ? <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>{actionLeft}</div> : null}

          <StarBorder
            as="button"
            className="primaryBtn"
            color="var(--accent)"
            speed="5s"
            onClick={onPrimaryAction}
            disabled={Boolean(primaryDisabled) || !onPrimaryAction}
            type="button"
          >
            {isWorking ? primaryActionWorkingLabel || 'Working…' : primaryActionLabel}
          </StarBorder>

          {meta ? <span className="muted">{meta}</span> : null}
        </div>

        {feedback ? <div className="serviceFeedback">{feedback}</div> : null}
        {children ? <div className="serviceControls">{children}</div> : null}
      </section>

      {preview ?? null}

      {related ? <RelatedTools currentSlug={slug} title={relatedTitle} /> : null}
    </div>
  )
}
