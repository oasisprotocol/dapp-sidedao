import { FieldConfiguration } from './validation'
import { FC } from 'react'
import { InputField } from './InputField'
import { InputFieldControls } from './useInputField'
import { AnimatePresence, motion } from 'framer-motion'
import classes from './index.module.css'

type InputFieldGroupProps = {
  fields: FieldConfiguration
  alignRight?: boolean
}

export const InputFieldGroup: FC<InputFieldGroupProps> = ({ fields, alignRight }) => (
  <AnimatePresence initial={false}>
    {fields.map((row, index) =>
      Array.isArray(row) ? (
        row.some(controls => controls.visible) ? (
          <motion.div
            layout
            className={alignRight ? classes.fieldRowRight : classes.fieldRow}
            key={`row-${index}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
          >
            {row.map(field => (
              <InputField key={field.name} controls={field as any} />
            ))}
          </motion.div>
        ) : undefined
      ) : (
        <InputField key={row.name} controls={row as InputFieldControls<any>} />
      ),
    )}
  </AnimatePresence>
)
