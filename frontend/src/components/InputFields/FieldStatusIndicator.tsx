import { AnimatePresence, motion } from 'framer-motion'
import { FC } from 'react'
import { CheckCircleIcon } from '../icons/CheckCircleIcon'
import { SpinnerIcon } from '../icons/SpinnerIcon'
import { checkProblems, Problem } from './util'
import { InputFieldControls } from './useInputField'
import { WarningCircleIcon } from '../icons/WarningCircleIcon'

export const FieldStatusIndicators: FC<
  Pick<
    InputFieldControls<any>,
    'indicateValidationPending' | 'indicateValidationSuccess' | 'validationPending' | 'isValidated'
  > & { problems: Problem[] }
> = props => {
  const { indicateValidationPending, indicateValidationSuccess, validationPending, isValidated, problems } =
    props
  const { hasError } = checkProblems(problems)
  const hasNoProblems = !problems.length
  const showSuccess = isValidated && indicateValidationSuccess && hasNoProblems
  const showPending = validationPending && indicateValidationPending
  const showError = hasError && !validationPending

  return (
    <AnimatePresence>
      {(showPending || showSuccess || showError) && (
        <motion.div
          key="field-status"
          initial={{ width: 0 }}
          animate={{ width: 'auto' }}
          exit={{ width: 0 }}
          // transition={{ duration: 2 }}
        >
          {showPending && (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SpinnerIcon width={24} height={24} spinning={true} />
            </motion.div>
          )}
          {showSuccess && (
            <motion.div
              key={'success'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CheckCircleIcon />
            </motion.div>
          )}
          {showError && (
            <motion.div key={'error'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WarningCircleIcon />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
