import type { LucideIcon, LucideProps } from 'lucide-react'
import {
  AlertOctagon,
  AlertTriangle,
  CreditCard,
  DoorOpen,
  Hand,
  Laptop,
  Pill,
  ShieldAlert,
  ShoppingBag,
  UserX,
} from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CrimeCategory } from '../types/crime'

const CRIME_CATEGORY_ICON_MAP: Record<CrimeCategory, LucideIcon> = {
  Theft: Hand,
  Cybercrime: Laptop,
  Burglary: DoorOpen,
  Assault: AlertTriangle,
  Fraud: CreditCard,
  'Domestic Violence': ShieldAlert,
  Robbery: ShoppingBag,
  'Drug Offense': Pill,
  Murder: AlertOctagon,
  Kidnapping: UserX,
}

/** Returns the Lucide icon component for a crime category (reused by map pins and future sidebar). */
export function getCrimeCategoryIcon(category: CrimeCategory): LucideIcon {
  return CRIME_CATEGORY_ICON_MAP[category] ?? AlertTriangle
}

export interface CrimeCategoryIconProps extends Omit<LucideProps, 'ref'> {
  category: CrimeCategory
}

/** React wrapper for category icons — use in sidebar/list UI. */
export function CrimeCategoryIcon({ category, ...props }: CrimeCategoryIconProps) {
  const Icon = getCrimeCategoryIcon(category)
  return <Icon aria-hidden {...props} />
}

/** Static SVG markup for Leaflet divIcon HTML (map pins). */
export function renderCrimeCategoryIconMarkup(
  category: CrimeCategory,
  options?: Pick<LucideProps, 'size' | 'color' | 'strokeWidth'>,
) {
  const Icon = getCrimeCategoryIcon(category)
  return renderToStaticMarkup(
    <Icon
      size={options?.size ?? 12}
      color={options?.color ?? '#ffffff'}
      strokeWidth={options?.strokeWidth ?? 2.25}
      aria-hidden
    />,
  )
}
