import { FC, PropsWithChildren } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { InputFieldControls } from './useInputField'
import { StringUtils } from '../../utils/string.utils'
import classes from './index.module.css'

export const WithVisibility: FC<
  PropsWithChildren<{
    field: Pick<InputFieldControls<any>, 'visible' | 'containerClassName' | 'name'>
    padding?: boolean
  }>
> = props => {
  const { field, children, padding = true } = props
  const { visible, containerClassName } = field

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          layout
          key={field.name}
          className={StringUtils.clsx(classes.fieldContainer, containerClassName)}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{
            // duration: 2,
            ease: 'easeInOut',
          }}
        >
          {children}
          {padding && <div key="padding" className={classes.fieldPadding} />}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
