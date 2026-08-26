import { Utensils } from 'lucide-react'

type BrandLogoMarkProps = {
  size?: number
  className?: string
}

export function BrandLogoMark({ size = 40, className = '' }: BrandLogoMarkProps) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`grid shrink-0 place-items-center rounded-[30%] bg-gradient-to-br from-brand-green-2 to-brand-green text-white shadow-[0_10px_28px_rgba(16,185,129,.22)] ${className}`}
    >
      <Utensils size={Math.round(size * 0.45)} strokeWidth={2.2} />
    </span>
  )
}
