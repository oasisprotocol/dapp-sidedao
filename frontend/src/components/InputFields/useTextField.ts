import { InputFieldControls, InputFieldProps, useInputField } from './useInputField';
import { getAsArray, getNumberMessage, NumberMessageTemplate } from './util';

type TextFieldProps = Omit<InputFieldProps<string>, "initialValue"> & {
  initialValue?: string

  minLength?: number
  tooShortMessage?: NumberMessageTemplate

  maxLength?: number
  tooLongMessage?: NumberMessageTemplate
}

export type TextFieldControls = InputFieldControls<string> & {

}

export function useTextField(props: TextFieldProps): TextFieldControls {
  const {
    initialValue = "",
    minLength,
    maxLength,
    tooShortMessage = minLength => `Please specify at least ${minLength} characters!`,
    tooLongMessage = maxLength => `Please specify at most ${maxLength} characters!`,
  } = props
  const controls = useInputField<string>({
      ...props,
      initialValue,
      validators: [
        // Check minimum length
        minLength ? ((value: string) => ((value !== "") && (value.length < minLength!))
            ? `${getNumberMessage(tooShortMessage, minLength)} (Currently: ${value.length})`
            : undefined
        ) : undefined,

        // Check maximum length
        maxLength ? ((value: string) => ((value !== "") && (value.length > maxLength!))
            ? `${getNumberMessage(tooLongMessage, maxLength)} (Currently: ${value.length})`
            : undefined
        ) : undefined,

        // Any custom validators
        ...getAsArray(props.validators),
      ].filter(v => !!v),
    }, {
      isEmpty: text => !text,
      isEqual: (a, b) => a === b,
    }
  )
  return {
    ...controls,
    setValue: (value) => {
      controls.clearAllProblems()
      controls.setValue(value)
    }
  }
}
