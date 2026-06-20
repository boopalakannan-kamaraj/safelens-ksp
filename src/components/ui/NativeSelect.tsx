import {
  Children,
  isValidElement,
  useId,
  useMemo,
  useRef,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import {
  formSelect,
  formSelectDropdown,
  formSelectDropdownEmpty,
  formSelectDropdownItem,
  formSelectDropdownItemSelected,
  formSelectDropdownList,
  formSelectFixed,
  formSelectMedium,
  formSelectWide,
  formSelectWrap,
} from './formClasses'
import { useSelectDropdown } from './useSelectDropdown'

type SelectWidth = 'default' | 'fixed' | 'wide' | 'medium'

interface SelectOption {
  value: string
  label: string
}

interface NativeSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'onChange'> {
  /** fixed = 160px, wide = min 180px, medium = min 130px */
  selectWidth?: SelectWidth
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void
}

const widthClass: Record<SelectWidth, string> = {
  default: formSelect,
  fixed: formSelectFixed,
  wide: formSelectWide,
  medium: formSelectMedium,
}

function optionLabelFromChildren(label: ReactNode): string {
  if (typeof label === 'string' || typeof label === 'number') return String(label)
  return ''
}

function optionsFromChildren(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = []

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const element = child as ReactElement<{ value?: string | number; children?: ReactNode }>
    if (element.type !== 'option') return
    options.push({
      value: String(element.props.value ?? ''),
      label: optionLabelFromChildren(element.props.children),
    })
  })

  return options
}

export default function NativeSelect({
  selectWidth = 'default',
  className = '',
  children,
  value,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  id,
  name,
}: NativeSelectProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const { open, toggle, close } = useSelectDropdown(wrapRef)

  const options = useMemo(() => optionsFromChildren(children), [children])
  const selectedValue = value == null ? '' : String(value)
  const selectedLabel = options.find((option) => option.value === selectedValue)?.label ?? selectedValue

  const triggerClass = `${widthClass[selectWidth]} ${className}`.trim()

  const selectOption = (nextValue: string) => {
    if (disabled) return
    onChange?.({ target: { value: nextValue, name: name ?? '' } } as ChangeEvent<HTMLSelectElement>)
    close()
  }

  return (
    <div ref={wrapRef} className={`${formSelectWrap} relative`}>
      <button
        type="button"
        id={id}
        className={triggerClass}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={toggle}
      >
        <span className="block truncate">{selectedLabel}</span>
      </button>
      {open && !disabled && (
        <div className={formSelectDropdown}>
          <ul id={listId} role="listbox" aria-label={ariaLabel} className={formSelectDropdownList}>
            {options.map((option) => {
              const selected = option.value === selectedValue
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`${formSelectDropdownItem} ${selected ? formSelectDropdownItemSelected : ''}`}
                    onClick={() => selectOption(option.value)}
                  >
                    {option.label}
                  </button>
                </li>
              )
            })}
            {options.length === 0 && <li className={formSelectDropdownEmpty}>No options</li>}
          </ul>
        </div>
      )}
      <select
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        value={selectedValue}
        name={name}
        onChange={onChange}
      >
        {children}
      </select>
    </div>
  )
}
