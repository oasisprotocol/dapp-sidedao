import { LabelControls } from './useLabel'
import { FC } from 'react'
import classes from './index.module.css'
import { StringUtils } from '../../utils/string.utils'
import { checkProblems } from './util'
import { ProblemList } from './ProblemDisplay'
import { motion } from 'framer-motion'

export const Label: FC<LabelControls> = props => {
  const {
    label,
    description,
    visible,
    value,
    allProblems,
    clearProblem,
    containerClassName,
    formatter,
    renderer,
    classnames,
  } = props
  if (!visible) return

  const formattedValue = formatter ? formatter(value) : value

  const renderedValue = renderer ? renderer(formattedValue) : formattedValue

  const field = <div className={StringUtils.clsx(...classnames)}>{renderedValue}</div>

  const rootProblems = allProblems.root || []

  const { hasWarning, hasError } = checkProblems(rootProblems)

  const wrappedField = (
    <div
      className={StringUtils.clsx(
        classes.textValue,
        hasError ? classes.fieldWithError : hasWarning ? classes.fieldWithWarning : '',
      )}
    >
      {field}
      <ProblemList problems={rootProblems} onRemove={clearProblem} />
    </div>
  )

  return (
    <motion.div
      layout
      className={StringUtils.clsx(classes.fieldContainer, containerClassName)}
      initial={{ opacity: 0, maxHeight: 0 }}
      animate={{ opacity: 1, maxHeight: '5em' }} // TODO: could be insufficient
      transition={{ duration: 0.5 }}
    >
      {!!label || !!description ? (
        <label>
          <div className={classes.fieldLabel}>{label}</div>
          <div className={classes.fieldDescription}>{description}</div>
          {wrappedField}
        </label>
      ) : (
        wrappedField
      )}
    </motion.div>
  )
}
