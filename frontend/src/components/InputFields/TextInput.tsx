import React, { FC, KeyboardEventHandler, useCallback } from 'react'
import classes from './index.module.css'
import { TextFieldControls } from './useTextField'
import { WithValidation } from './WithValidation'
import { WithLabelAndDescription } from './WithLabelAndDescription'
import { WithVisibility } from './WithVisibility'

export const TextInput: FC<TextFieldControls> = props => {
  const { name, value, placeholder, setValue, allProblems, enabled, whyDisabled, autoFocus, onEnter } = props
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setValue(event.target.value),
    [setValue],
  )

  const handleKeyPress: KeyboardEventHandler<HTMLInputElement> = useCallback(
    event => {
      if (event.key == 'Enter') {
        if (onEnter) onEnter()
      }
    },
    [onEnter],
  )

  return (
    <WithVisibility field={props}>
      <WithLabelAndDescription field={props}>
        <WithValidation field={props} problems={allProblems.root} fieldClasses={[classes.textValue]}>
          <input
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            className={classes.textValue}
            disabled={!enabled}
            title={whyDisabled}
            autoFocus={autoFocus}
            onKeyDown={handleKeyPress}
          />
        </WithValidation>
      </WithLabelAndDescription>
    </WithVisibility>
  )
}
