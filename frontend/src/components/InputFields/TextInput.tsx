import React, { FC, useCallback } from 'react';
import classes from "./index.module.css";
import { StringUtils } from '../../utils/string.utils';
import { TextFieldControls } from './useTextField';
import { ProblemList } from './ProblemDisplay';
import { checkProblems } from './util';
import { SpinnerIcon } from '../icons/SpinnerIcon';

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
    validationPending,
    visible,
    enabled,
    whyDisabled,
  }
) => {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setValue(event.target.value),
    [setValue]
  )

  if (!visible) return

  const field = (
    <input
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      className={classes.textValue}
      disabled={!enabled}
      title={whyDisabled}
    />
  )

  const rootProblems = allProblems.root || []

  const { hasWarning, hasError} = checkProblems(rootProblems)

  const wrappedField = (
    <div className={StringUtils.clsx(
      classes.textValue,
      hasError ? classes.fieldWithError : hasWarning ? classes.fieldWithWarning : '',
    )}>
      {field}
      <ProblemList problems={rootProblems} onRemove={clearProblem} />
      { validationPending && <div className={"niceLine"}>
        Checking ...
        <SpinnerIcon width={24} height={24} spinning={true}/>
      </div>}
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