import { createElement } from 'react'
import './StarBorder.css'

export default function StarBorder({
  as: Component = 'button',
  className = '',
  color = 'var(--accent)',
  speed = '6s',
  thickness = 1,
  children,
  ...rest
}) {
  return createElement(
    Component,
    {
      className: 'star-border-container',
      style: {
        padding: `${thickness}px 0`,
        ...rest.style,
      },
      ...rest,
    },
    <>
      <div
        className="border-gradient-bottom"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 12%)`,
          animationDuration: speed,
        }}
      ></div>
      <div
        className="border-gradient-top"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 12%)`,
          animationDuration: speed,
        }}
      ></div>
      <div className={`inner-content ${className}`}>{children}</div>
    </>,
  )
}
