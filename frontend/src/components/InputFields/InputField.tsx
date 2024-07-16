import { FC } from 'react';
import { InputFieldControls } from './useInputField';
import { TextInput } from './TextInput';
import { TextFieldControls } from './useTextField';
import { TextArrayInput } from './TextArrayInput';
import { TextArrayControls } from './useTextArrayField';
import { BooleanInput } from './BooleanInput';
import { BooleanFieldControls } from './useBoolField';

export const InputField: FC<{controls: InputFieldControls<any>}> = ({controls}) => {
  switch (controls.type) {
    case "text":
      return <TextInput { ...(controls as TextFieldControls)}  />
    case "text-array":
      return <TextArrayInput { ...(controls as TextArrayControls)} />
    case "boolean":
      return <BooleanInput { ...(controls as BooleanFieldControls)} />
    default:
      console.log("Don't know how to edit field type", controls.type)
      return undefined;
  }

}