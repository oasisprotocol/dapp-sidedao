import { FC, PropsWithChildren, ReactNode } from 'react'
import { StringUtils } from '../../utils/string.utils'
import classes from './index.module.css'
import { InputFieldControls } from './useInputField'
import { checkProblems, Problem } from './util'
import { ProblemAndValidationMessage } from './ProblemAndValidationMessage'
import { FieldStatusIndicators } from './FieldStatusIndicator'

export const WithValidation: FC<
  PropsWithChildren<{
    field: Pick<
      InputFieldControls<any>,
      | 'indicateValidationPending'
      | 'indicateValidationSuccess'
      | 'validationPending'
      | 'isValidated'
      | 'validationStatusMessage'
      | 'clearProblem'
    >
    fieldClasses?: string[]
    problems: Problem[] | undefined
    extraWidget?: ReactNode | undefined
  }>
> = props => {
  const { field, fieldClasses = [], problems = [], children, extraWidget } = props
  const { hasWarning, hasError } = checkProblems(problems)
  return (
    <div
      className={StringUtils.clsx(
        ...fieldClasses,
        classes.textValue,
        hasError ? classes.fieldWithError : hasWarning ? classes.fieldWithWarning : '',
      )}
    >
      <div key="field-and-status" className="niceLine">
        {children}
        <FieldStatusIndicators key={'status'} {...field} problems={problems} />
        {extraWidget}
      </div>
      <ProblemAndValidationMessage key="problems-and-status" problems={problems} {...field} />
    </div>
  )
}
