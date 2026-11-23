import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function prefersReducedMotion() {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  } catch {
    return false
  }
}

export default function AuthShell({
  title,
  subtitle,
  children,
  showBackToTools = true,
  backLink = '/',
}) {
  const testimonials = useMemo(
    () => [
      {
        quote:
          'Fast tools, clean output, and a smooth workflow—exactly what I need for quick PDF work.',
        name: 'Aditi',
        role: 'Product Designer',
      },
      {
        quote: 'The UI is simple and the results are consistent. I can get in and out in minutes.',
        name: 'Mark',
        role: 'Operations',
      },
      {
        quote: 'Reliable conversions and a clean experience. It feels focused and professional.',
        name: 'Sana',
        role: 'Founder',
      },
    ],
    [],
  )

  const [tIndex, setTIndex] = useState(0)
  const reduceMotion = prefersReducedMotion()

  useEffect(() => {
    document.body.classList.add('authPage')
    return () => {
      document.body.classList.remove('authPage')
    }
  }, [])

  useEffect(() => {
    if (reduceMotion) return
    const id = setInterval(() => {
      setTIndex((i) => (i + 1) % testimonials.length)
    }, 7000)
    return () => clearInterval(id)
  }, [reduceMotion, testimonials.length])

  const t = testimonials[tIndex]

  function prevTestimonial() {
    setTIndex((i) => (i - 1 + testimonials.length) % testimonials.length)
  }

  function nextTestimonial() {
    setTIndex((i) => (i + 1) % testimonials.length)
  }

  return (
    <div className="authFrame">
      <div className="authSplit">
        <section className="authLeftPane">
          <div className="authLeftInner">
            <div className="authBrandRow">
              <Link className="authBrand" to={backLink} aria-label="Back to tools">
                DammyPDF
              </Link>
            </div>

            <div className="authHeadingBlock">
              <h1 className="authTitle">{title}</h1>
              {subtitle ? <p className="authSubtitle">{subtitle}</p> : null}
            </div>

            <div className="authFormPanel authMotionIn">{children}</div>

            {showBackToTools ? (
              <div className="authBottomLinkRow">
                <Link className="authBottomLink" to={backLink}>
                  Back to tools
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="authRightPane" aria-hidden="true">
          <div className="authPromo">
            <div className="authPromoTop" key={tIndex}>
              <div className="authPromoHeadline">What users are saying.</div>
              <div className="authPromoQuoteMark">“</div>
              <div className="authPromoQuote">{t.quote}</div>
              <div className="authPromoAttribution">
                <div className="authPromoName">{t.name}</div>
                <div className="authPromoRole">{t.role}</div>
              </div>

              <div className="authPromoArrows">
                <button
                  className="authArrow authArrowLight"
                  type="button"
                  onClick={prevTestimonial}
                  aria-label="Previous testimonial"
                  tabIndex={-1}
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  className="authArrow authArrowDark"
                  type="button"
                  onClick={nextTestimonial}
                  aria-label="Next testimonial"
                  tabIndex={-1}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="authPromoCard authMotionIn">
              <div className="authPromoCardTitle">Convert, merge, and compress in minutes</div>
              <div className="authPromoCardText">
                Upload your file, pick a tool, and download—no complicated steps.
              </div>
              <div className="authPromoCardDot">✦</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
