import React, { FC, useCallback } from 'react';
import { OneOfFieldControls } from './useOneOfField';
import { checkProblems, getReasonForDenial, getVerdict } from './util';
import classes from "./index.module.css";
import { StringUtils } from '../../utils/string.utils';
import { ProblemList } from './ProblemDisplay';

export const SelectInput: FC<OneOfFieldControls<any>> = (props) => {
  const {
    label, description,
    choices,
    allProblems, clearProblem,
    value, setValue,
    visible,
    enabled,
    whyDisabled,
  } = props

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => setValue(e.target.value),
    [setValue]
  )

  if (!visible) return

  const field = (
    <select
      value={value}
      onChange={handleChange}
      disabled={!enabled}
    >
      { choices.filter(c => !c.hidden).map(choice => (
        <option
          key={choice.value}
          value={choice.value}
          disabled={!getVerdict(choice.enabled, true)}
          title={getReasonForDenial(choice.enabled) ?? choice.description}
        >
          { choice.label } { !!choice.description ? "🛈" : "" }
        </option>
      ))}
    </select>
  )

  const rootProblems = allProblems.root || []

  const { hasWarning, hasError} = checkProblems(rootProblems)

  const wrappedField = (
    <div className={StringUtils.clsx(
      classes.selectValue,
      hasError ? classes.fieldWithError : hasWarning ? classes.fieldWithWarning : '',
    )}>
      {field}
      <ProblemList problems={rootProblems} onRemove={clearProblem} />
    </div>
  )

  return (
    <div className={classes.fieldContainer} title={whyDisabled}>
      {(!!label || !!description)
        ? (
          <label>
            <div className={classes.fieldLabel}>
              {label}
            </div>
            <div className={classes.fieldDescription}>
              {description}
            </div>
            {wrappedField}
          </label>
        ) : wrappedField
      }
    </div>
  )
}