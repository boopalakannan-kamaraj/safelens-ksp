import type { SelectHTMLAttributes } from 'react'
import { formSelect, formSelectFixed, formSelectMedium, formSelectWide } from './formClasses'

type SelectWidth = 'default' | 'fixed' | 'wide' | 'medium'

interface NativeSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** fixed = 160px, wide = min 180px, medium = min 130px */
  selectWidth?: SelectWidth
}

const widthClass: Record<SelectWidth, string> = {
  default: formSelect,
  fixed: formSelectFixed,
  wide: formSelectWide,
  medium: formSelectMedium,
}

export default function NativeSelect({
  selectWidth = 'default',
  className = '',
  children,
  ...props
}: NativeSelectProps) {
  return (
    <div className="form-select-wrap">
      <select className={`${widthClass[selectWidth]} ${className}`.trim()} {...props}>
        {children}
      </select>
    </div>
  )
}
