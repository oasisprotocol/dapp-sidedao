import React, { FC, useCallback } from 'react'
import { OneOfFieldControls } from './useOneOfField'
import { getReasonForDenial, getVerdict } from './util'
import { WithVisibility } from './WithVisibility'
import { WithLabelAndDescription } from './WithLabelAndDescription'
import { WithValidation } from './WithValidation'
import classes from './index.module.css'
import { MaybeWithTooltip } from '../Tooltip/MaybeWithTooltip'

export const SelectInput: FC<OneOfFieldControls<any>> = props => {
  const { choices, allProblems, value, setValue, enabled } = props

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => setValue(e.target.value),
    [setValue],
  )

  return (
    <WithVisibility field={props}>
      <WithLabelAndDescription field={props}>
        <WithValidation field={props} problems={allProblems.root} fieldClasses={[classes.selectValue]}>
          <select value={value} onChange={handleChange} disabled={!enabled}>
            {choices
              .filter(c => !c.hidden)
              .map(choice => {
                const disabled = !getVerdict(choice.enabled, true)
                return (
                  <option key={choice.value} value={choice.value} disabled={disabled}>
                    <MaybeWithTooltip overlay={getReasonForDenial(choice.enabled) ?? choice.description}>
                      <span>
                        {choice.label} {disabled || choice.description ? '🛈' : ''}
                      </span>
                    </MaybeWithTooltip>
                  </option>
                )
              })}
          </select>
        </WithValidation>
      </WithLabelAndDescription>
    </WithVisibility>
  )
}
