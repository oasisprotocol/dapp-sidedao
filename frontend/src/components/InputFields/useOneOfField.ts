import { InputFieldControls, InputFieldProps, useInputField } from './useInputField'
import { Decision, getVerdict } from './util'

export type Choice<DataType = string> = {
  value: DataType
  label: string
  description?: string
  enabled?: Decision
  hidden?: boolean
}

type OneOfFieldProps<DataType = string> = Omit<
  InputFieldProps<DataType>,
  'initialValue' | 'required' | 'placeholder'
> & {
  initialValue?: DataType
  choices: Choice<DataType>[]
  requiredMessage?: string
}

export type OneOfFieldControls<DataType> = InputFieldControls<DataType> & {
  choices: Choice<DataType>[]
}

export function useOneOfField<DataType>(props: OneOfFieldProps<DataType>): OneOfFieldControls<DataType> {
  const { choices, requiredMessage = 'Please select an option!' } = props
  const visibleChoices = choices.filter(choice => !choice.hidden)
  const enabledChoices = visibleChoices.filter(choice => getVerdict(choice.enabled, true))
  const initialValue = props.initialValue ?? (enabledChoices[0] ?? visibleChoices[0]).value

  const controls = useInputField<DataType>(
    'oneOf',
    {
      ...props,
      initialValue,
      required: [true, requiredMessage],
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
