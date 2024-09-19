import { ChangeEvent, FC, useCallback } from 'react'
import { BooleanFieldControls } from './useBoolField'
import classes from './index.module.css'
import { checkProblems } from './util'
import { StringUtils } from '../../utils/string.utils'
import { ProblemList } from './ProblemDisplay'
import { motion } from 'framer-motion'

export const BooleanInput: FC<BooleanFieldControls> = props => {
  const {
    name,
    label,
    description,
    value,
    setValue,
    allProblems,
    clearProblem,
    visible,
    enabled,
    whyDisabled,
    containerClassName,
  } = props

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setValue(event.target.checked),
    [setValue],
  )

  const handleLabelClick = () => {
    if (enabled) setValue(!value)
  }

  if (!visible) return

  const rootProblems = allProblems.root || []

  const { hasWarning, hasError } = checkProblems(rootProblems)

  const field = (
    <input
      type={'checkbox'}
      name={name}
      checked={value}
      onChange={handleChange}
      size={32}
      disabled={!enabled}
    />
  )

  const wrappedField = (
    <div
      className={StringUtils.clsx(
        classes.boolValue,
        hasError ? classes.fieldWithError : hasWarning ? classes.fieldWithWarning : '',
      )}
    >
      <div className={'niceLine'} title={whyDisabled}>
        {field}{' '}
        <span className={enabled ? classes.pointer : classes.disabled} onClick={handleLabelClick}>
          {label}
        </span>
      </div>
      <ProblemList problems={rootProblems} onRemove={clearProblem} />
    </div>
  )

  return (
    <motion.div
      layout
      className={StringUtils.clsx(classes.fieldContainer, containerClassName)}
      initial={{ height: 0 }}
      animate={{ height: 'auto' }}
      exit={{ height: 0 }}
      transition={{ duration: 0.5 }}
    >
      {description ? (
        <label>
          <div className={classes.fieldDescription}>{description}</div>
          {wrappedField}
        </label>
      ) : (
        wrappedField
      )}
    </motion.div>
  )
}
