import { AnimatePresence, motion } from 'framer-motion'
import { FC } from 'react'
import { ProblemList } from './ProblemDisplay'
import { Problem } from './util'
import { InputFieldControls } from './useInputField'

export const ProblemAndValidationMessage: FC<
  Pick<InputFieldControls<any>, 'validationPending' | 'validationStatusMessage' | 'clearProblem'> & {
    problems: Problem[]
  }
> = props => {
  const { validationPending, validationStatusMessage, problems, clearProblem } = props

  return (
    <>
      <ProblemList problems={problems} onRemove={clearProblem} />
      <AnimatePresence mode={'wait'}>
        {!!validationStatusMessage && validationPending && (
          <motion.div
            key={'problems-and-validation-messages'}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, delay: 0 }}
          >
            {validationStatusMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
