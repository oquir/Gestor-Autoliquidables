import type { CardProps } from './Card.types'

export default function Card({ children, className = '', id }: CardProps) {
  return (
    <section
      id={id}
      className={`rounded-xl border border-border bg-surface shadow-sm grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr_auto] gap-0.75 ${className}`}
    >
      {children}
    </section>
  )
}
