import { InputFieldControls, InputFieldProps, useInputField } from './useInputField';
import { Decision } from './util';

export type Choice<DataType = string> = {
  value: DataType,
  label: string,
  description?: string,
  enabled?: Decision,
  hidden?: boolean,
}

type OneOfFieldProps<DataType = string> = Omit<InputFieldProps<DataType>, "initialValue"> & {
  initialValue?: DataType;
  choices: Choice<DataType>[],
}

export type OneOfFieldControls<DataType> = InputFieldControls<DataType> & {
  choices: Choice<DataType>[],
}

const NO_CHOICE = "_no_choice_"

export function useOneOfField<DataType>(props: OneOfFieldProps<DataType>): OneOfFieldControls<DataType> {
  const {
    placeholder = "Please select",
    choices,
    requiredMessage = "Please select an option!",
    initialValue = NO_CHOICE as DataType,
  } = props

  const emptyChoice: Choice<DataType> = {
    value: NO_CHOICE as DataType,
    label: placeholder,
    enabled: false,
  }

  const allChoices: Choice<DataType>[] = [
    ...(initialValue === NO_CHOICE ? [emptyChoice] : []),
    ...choices,
  ]

  return {
    ...useInputField<DataType>(
      "oneOf",
      {
        ...props,
        initialValue,
        requiredMessage,
      },
      {
        isEmpty: (value) => value === NO_CHOICE,
        isEqual: (a, b) => a === b,
      },
    ),
    choices: allChoices,
  }
}