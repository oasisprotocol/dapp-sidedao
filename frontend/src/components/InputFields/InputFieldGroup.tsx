import { FieldConfiguration } from './validation';
import { FC } from 'react';
import { InputField } from './InputField';
import { InputFieldControls } from './useInputField';

type InputFieldGroupProps = {
  fields: FieldConfiguration
}

export const InputFieldGroup: FC<InputFieldGroupProps> = ({ fields }) => {
  return (<>
    {fields.map(
      row => Array.isArray(row)
        ? (
          <div className={"niceLineWide"}>
            { row.map(field =>
              <InputField key={field.name} controls={field} />
            ) }
          </div>
        ) : <InputField key={row.name} controls={row as InputFieldControls<any>} />)}
  </>)
}