import { ChangeEvent, FC, useCallback } from 'react';
import { BooleanFieldControls } from './useBoolField';
import classes from "./index.module.css";
import { checkProblems } from './util';
import { StringUtils } from '../../utils/string.utils';
import { ProblemList } from './ProblemDisplay';

export const BooleanInput: FC<BooleanFieldControls> = (props) => {
  const {
    name,
    label,
    description,
    value,
    setValue,
    allProblems,
    clearProblem,
  } = props

  const rootProblems = allProblems.root || []

  const { hasWarning, hasError} = checkProblems(rootProblems)

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setValue(event.target.checked),
    [setValue]
  )

  const field = (
    <input
      type={"checkbox"}
      name={name}
      checked={value}
      onChange={handleChange}
      size={32}
    />
  )

  const wrappedField = (
    <div className={StringUtils.clsx(
      classes.boolValue,
      hasError ? classes.fieldWithError : hasWarning ? classes.fieldWithWarning : '',
    )}>
      <div className={"niceLine"}>
        {field} {label}
      </div>
      <ProblemList problems={rootProblems} onRemove={clearProblem} />
    </div>
  )

  return (
    <div className={classes.fieldContainer}>
      {description
        ? (
          <label>
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