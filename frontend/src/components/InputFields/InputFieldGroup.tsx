import { FieldConfiguration } from './validation';
import { FC } from 'react';
import { InputField } from './InputField';
import { InputFieldControls } from './useInputField';
import classes from "./index.module.css"

type InputFieldGroupProps = {
  fields: FieldConfiguration
}

export const InputFieldGroup: FC<InputFieldGroupProps> = ({ fields }) => (
  <>
    {fields.map(
      (row, index) => Array.isArray(row)
        ? (row.some(controls => controls.visible)
            ? (
              <div className={classes.fieldRow} key={`row-${index}`}>
                { row.map(field =>
                  <InputField key={field.name} controls={field as any} />
                ) }
              </div>
            ) : undefined
        ) : <InputField key={row.name} controls={row as InputFieldControls<any>} />
      )
    }
  </>
)
