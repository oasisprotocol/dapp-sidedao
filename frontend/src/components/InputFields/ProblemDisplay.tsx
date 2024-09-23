import { FC, ForwardedRef, forwardRef } from 'react'
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
}> = forwardRef(({ problem, onRemove }, ref: ForwardedRef<HTMLDivElement>) => {
  // console.log('Displaying problem', problem)
  return (
    <motion.div
      ref={ref}
      key={problem.signature || problem.message}
      // layout
      className={problemClass[problem.level ?? 'error']}
      onClick={() => onRemove(problem.message)}
      // initial={{ opacity: 0, y: '-50%' }}
      // animate={{ opacity: 1, x: 0, y: 0 }}
      // exit={{ opacity: 0, x: '+10%' }}
      initial={{ opacity: 0, height: 0, x: 50 }}
      animate={{ opacity: 1, height: 'auto', x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {problem.message}
    </motion.div>
  )
})

export const ProblemList: FC<{
  problems: Problem[] | undefined
  onRemove: (id: string) => void
}> = ({ problems = [], onRemove }) => (
  <AnimatePresence mode={'wait'} initial={false}>
    {problems.map(p => (
      <ProblemDisplay key={p.signature ?? p.message} problem={p} onRemove={onRemove} />
    ))}
  </AnimatePresence>
)
