import React, { FC, useCallback } from 'react'
import classes from './index.module.css'
import { StringUtils } from '../../utils/string.utils'
import { DateFieldControls } from './useDateField'
import { ProblemList } from './ProblemDisplay'
import { checkProblems } from './util'
import { SpinnerIcon } from '../icons/SpinnerIcon'
import { CheckCircleIcon } from '../icons/CheckCircleIcon'

const convertToDateTimeLocalString = (date: Date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export const DateInput: FC<DateFieldControls> = ({
  name,
  label,
  description,
  value,
  placeholder,
  setValue,
  allProblems,
  hasProblems,
  isValidated,
  indicateValidationSuccess,
  clearProblem,
  validationPending,
  validationStatusMessage,
  visible,
  enabled,
  whyDisabled,
}) => {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setValue(new Date(event.target.value)),
    [setValue],
  )

  if (!visible) return

  const field = (
    <input
      name={name}
      placeholder={placeholder}
      type={'datetime-local'}
      value={value ? convertToDateTimeLocalString(value) : undefined}
      onChange={handleChange}
      className={classes.textValue}
      disabled={!enabled}
      title={whyDisabled}
    />
  )

  const rootProblems = allProblems.root || []

  const hasNoProblems = !hasProblems

  const { hasWarning, hasError } = checkProblems(rootProblems)

  const wrappedField = (
    <div
      className={StringUtils.clsx(
        classes.textValue,
        hasError ? classes.fieldWithError : hasWarning ? classes.fieldWithWarning : '',
      )}
    >
      <div className="niceLine">
        {field}
        {isValidated && indicateValidationSuccess && hasNoProblems && <CheckCircleIcon />}
      </div>
      <ProblemList problems={rootProblems} onRemove={clearProblem} />
      {validationPending && (
        <div className={'niceLine'}>
          {validationStatusMessage}
          <SpinnerIcon width={24} height={24} spinning={true} />
        </div>
      )}
    </div>
  )

  return (
    <div className={classes.fieldContainer}>
      {!!label || !!description ? (
        <label>
          <div className={classes.fieldLabel}>{label}</div>
          <div className={classes.fieldDescription}>{description}</div>
          {wrappedField}
        </label>
      ) : (
        wrappedField
      )}
    </div>
  )
}
