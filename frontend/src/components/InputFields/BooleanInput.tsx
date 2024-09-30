import { ChangeEvent, FC, useCallback } from 'react'
import { BooleanFieldControls } from './useBoolField'
import classes from './index.module.css'
import { StringUtils } from '../../utils/string.utils'

import { WithVisibility } from './WithVisibility'
import { WithValidation } from './WithValidation'

export const BooleanInput: FC<BooleanFieldControls> = props => {
  const { name, description, label, value, setValue, allProblems, enabled, whyDisabled } = props

  // Clicking on the checkbox itself
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setValue(event.target.checked),
    [setValue],
  )

  // Clicking on the label
  const handleLabelClick = useCallback(() => {
    console.log('label click')
    if (enabled) setValue(!value)
  }, [enabled, setValue, value])

  return (
    <WithVisibility field={props}>
      <WithValidation field={props} problems={allProblems.root}>
        <div
          className={StringUtils.clsx('niceLine', enabled ? classes.pointer : classes.disabled)}
          title={whyDisabled}
          onClick={handleLabelClick}
        >
          <input
            type={'checkbox'}
            name={name}
            checked={value}
            onChange={handleChange}
            size={32}
            disabled={!enabled}
          />
          {label}
          {description && <span title={description}>🛈</span>}
        </div>
      </WithValidation>
    </WithVisibility>
  )
}
