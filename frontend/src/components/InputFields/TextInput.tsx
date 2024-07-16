import React, { FC, useCallback } from 'react';
import classes from "./index.module.css";
import { StringUtils } from '../../utils/string.utils';
import { TextFieldControls } from './useTextField';
import { ProblemDisplay } from './ProblemDisplay';

export const TextInput: FC<TextFieldControls & {}> = (
  {
    name,
    label,
    description,
    value,
    placeholder,
    setValue,
    allProblems,
    clearProblem,
  }
) => {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setValue(event.target.value),
    [setValue]
  )

  const field = <input
    name={name}
    placeholder={placeholder}
    value={value}
    onChange={handleChange}
    className={classes.textValue}
  />

  const rootProblems = allProblems.root || []

  const hasWarning = rootProblems.some((problem) => problem.level === "warning")
  const hasError = rootProblems.some((problem) => problem.level === "error")

  const wrappedField = (
    <div className={StringUtils.clsx(
      classes.textValue,
      hasError ? classes.fieldWithError : hasWarning ? classes.fieldWithWarning : '',
    )}>
      {field}
      { rootProblems.map(p => <ProblemDisplay key={p.id} problem={p} onRemove={clearProblem} />) }
    </div>
  )

  return (
    <div className={classes.fieldContainer}>
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