import { FieldConfiguration } from './validation'
import { FC } from 'react'
import { InputField } from './InputField'
import { InputFieldControls } from './useInputField'
import classes from './index.module.css'

type InputFieldGroupProps = {
  fields: FieldConfiguration
  alignRight?: boolean
}

export const InputFieldGroup: FC<InputFieldGroupProps> = ({ fields, alignRight }) => (
  <>
    {fields.map((row, index) =>
      Array.isArray(row) ? (
        row.some(controls => controls.visible) ? (
          <div className={alignRight ? classes.fieldRowRight : classes.fieldRow} key={`row-${index}`}>
            {row.map(field => (
              <InputField key={field.name} controls={field as any} />
            ))}
          </div>
        ) : undefined
      ) : (
        <InputField key={row.name} controls={row as InputFieldControls<any>} />
      ),
    )}
  </>
)
