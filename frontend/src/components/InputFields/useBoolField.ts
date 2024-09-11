import { InputFieldControls, InputFieldProps, useInputField } from './useInputField'

type BoolFieldProps = Omit<InputFieldProps<boolean>, 'initialValue' | 'placeholder' | 'label'> & {
  initialValue?: boolean
  label: string
}

export type BooleanFieldControls = InputFieldControls<boolean> & {
  label: string
}

export function useBooleanField(props: BoolFieldProps): BooleanFieldControls {
  const { label, initialValue = false } = props

  const controls = useInputField<boolean>(
    'boolean',
    {
      ...props,
      initialValue,
    },
    {
      isEmpty: () => false,
      isEqual: (a, b) => a === b,
    },
  )

  return {
    ...controls,
    label,
    setValue: value => {
      controls.clearAllProblems()
      controls.setValue(value)
    },
  }
}
