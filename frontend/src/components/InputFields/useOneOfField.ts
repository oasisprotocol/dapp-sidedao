import { InputFieldControls, InputFieldProps, useInputField } from './useInputField';
import { Decision } from './util';

export type Choice<DataType = string> = {
  value: DataType,
  label: string,
  description?: string,
  enabled?: Decision,
  hidden?: boolean,
}

type OneOfFieldProps<DataType = string> = Omit<InputFieldProps<DataType>, "initialValue" |  "required" | "placeholder"> & {
  initialValue?: DataType;
  choices: Choice<DataType>[],
}

export type OneOfFieldControls<DataType> = InputFieldControls<DataType> & {
  choices: Choice<DataType>[],
}

export function useOneOfField<DataType>(props: OneOfFieldProps<DataType>): OneOfFieldControls<DataType> {
  const {
    choices,
    requiredMessage = "Please select an option!",
    initialValue = choices[0].value,
  } = props

  const controls = useInputField<DataType>(
    "oneOf",
    {
      ...props,
      initialValue,
      requiredMessage,
      cleanUp: v => v,
    },
    {
      isEmpty: () => false,
      isEqual: (a, b) => a === b,
    },
  )

  return {
    ...controls,
    setValue: value => {
      controls.setValue(value)
      controls.clearAllProblems()
    },
    choices,
  }
}