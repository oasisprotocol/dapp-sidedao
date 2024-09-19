import { FC } from 'react'
import { Problem, ProblemLevel } from './util'
import classes from './index.module.css'
import { AnimatePresence, motion } from 'framer-motion'

const problemClass: Record<ProblemLevel, string> = {
  error: classes.fieldError,
  warning: classes.fieldWarning,
}

export const ProblemDisplay: FC<{
  problem: Problem
  onRemove: (id: string) => void
}> = ({ problem, onRemove }) => {
  return (
    <motion.div
      layout
      className={problemClass[problem.level]}
      onClick={() => onRemove(problem.id)}
      initial={{
        opacity: 0,
        maxHeight: 0,
      }}
      animate={{
        opacity: 1,
        maxHeight: '5em', // TODO: could be insufficient
      }}
      exit={{
        opacity: 0,
        maxHeight: 0,
      }}
      transition={{ duration: 1 }}
    >
      {problem.message}
    </motion.div>
  )
}

export const ProblemList: FC<{
  problems: Problem[] | undefined
  onRemove: (id: string) => void
}> = ({ problems = [], onRemove }) => (
  <AnimatePresence>
    {problems.map(p => (
      <ProblemDisplay key={p.id} problem={p} onRemove={onRemove} />
    ))}
  </AnimatePresence>
)
