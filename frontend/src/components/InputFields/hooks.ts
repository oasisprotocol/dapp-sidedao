import { useState } from 'react';

type InputFieldProps<DataType> = {
  name: string;
  description?: string;
  label?: string;
  placeholder?: string;
  initialValue: DataType
  cleanUp?: (value: DataType) => DataType
  required?: boolean
  requiredMessage?: string
  validator?: (value: DataType) => string | string[] | undefined
}

export type InputFieldControls<DataType> = Pick<InputFieldProps<DataType>, "label" | "description" | "placeholder" | "name"> & {
  value: DataType,
  setValue: (value: DataType) => void
  error: string | undefined
  validate: () => boolean
  clearError: () => void
}

type TypeTools<DataType> = {
  isEmpty: (data: DataType) => boolean
  isEqual: (data1: DataType, data2: DataType) => boolean
}

function useInputField<DataType>(props: InputFieldProps<DataType>, typeControl: TypeTools<DataType>): InputFieldControls<DataType> {
  const { name, label, placeholder, description, initialValue, cleanUp, required, requiredMessage, validator} = props

  const [value, setValue] = useState<DataType>(initialValue)
  const [error, setError] = useState<string | undefined>()
  const { isEmpty, isEqual } = typeControl

  const validate = () : boolean => {
    const cleanValue = cleanUp ? cleanUp(value) : value
    const different = !isEqual(cleanValue, value)
    if (different) {
      setValue(cleanValue)
    }
    if (required) {
      if (isEmpty(cleanValue)) {
        setError(requiredMessage ?? "This field is required")
        return false
      }
    }
    if (validator) {
      const validatorErrors = validator(cleanValue)
      switch (typeof validatorErrors) {
        case 'string':
          setError(validatorErrors)
          return false;
        case "undefined":
          // No error, nothing to do
          break;
        case 'object':
          const errors = validatorErrors as string[]
          if (errors.length) {
            setError(errors.join(", "))
          }
          return false;
      }
    }
    setError(undefined)
    return true
  }

  const clearError = () => {
    setError(undefined)
  }

  return {
    name,
    description,
    label,
    placeholder,
    value,
    setValue: value => {
      clearError();
      setValue(value)
    },
    error,
    validate,
    clearError,
  }
}

type TextFieldProps = Omit<InputFieldProps<string>, "initialValue"> & {
  initialValue?: string
  minLength?: number
  maxLength?: number
}

export type TextFieldControls = InputFieldControls<string> & {

}

export function useTextField(props: TextFieldProps): TextFieldControls {
  const controls = useInputField<string>({
    ...props,
    initialValue: props.initialValue ?? "",
    validator: (value) => {
      if (props.minLength && (value.length < props.minLength)) {
        return `Please specify at least ${props.minLength} characters! (Currently: ${value.length})`
      }
      if (props.maxLength && (value.length > props.maxLength)) {
        return `Please specify at most ${props.maxLength} characters! (Currently: ${value.length})`
      }
      if (props.validator) {
        return props.validator(value)
      }
      return undefined
    },
    cleanUp: props.cleanUp ?? (value => value.trim()),
  }, {
    isEmpty: text => !text,
    isEqual: (a, b) => a === b,
  })
  return {
    ...controls
  }
}

type TextArrayProps = Omit<InputFieldProps<string[]>, "initialValue"> & {
  initialValue?: string[]
  placeholders?: string[]
  placeholderTemplate?: (index: number) => string,
  minCount?: number,
  maxCount?: number,
  addLabel?: string,
  removeLabel?: string,
  canRemoveElement?: (index: number, me: TextArrayControls) => boolean
}

export type TextArrayControls = InputFieldControls<string[]> & Pick<TextArrayProps, "addLabel" | "removeLabel"> & {
  readonly numberOfValues: number

  readonly setSpecificValue: (index: number, value: string) => void
  readonly placeholders: string[]

  readonly canAddValue: boolean;
  addValue: () => void

  canRemoveValue: (index: number) => boolean
  removeValue: (index: number) => void
}

export function useTextArrayField(props: TextArrayProps): TextArrayControls {
  const { addLabel, removeLabel} = props;
  const initialValue = props.initialValue ?? [...Array(props.minCount ?? 3).keys()].map(
    (_ , _index) => ""
  )

  const controls = useInputField<string[]>({
    ...props,
    initialValue,
  }, {
    isEmpty: (value) => value.length < (props.minCount ?? 1),
    isEqual: (a, b) => a.join("-") === b.join("-"),
  })

  const placeholders = props.placeholders ?? [...Array( controls.value.length).keys()].map(
    (_ , index) => props.placeholderTemplate ? props.placeholderTemplate(index) : ""
  )

  const newControls: TextArrayControls = {
    ...controls,
    placeholders,
    numberOfValues: controls.value.length,
    setSpecificValue: (index, value) =>
      controls.setValue(controls.value.map((oldValue, oldIndex) => (oldIndex === index ? value : oldValue))),
    canAddValue: !props.maxCount || controls.value.length < props.maxCount,
    addLabel,
    addValue: () => controls.setValue([...controls.value, ""]),
    canRemoveValue: () => false,
    removeLabel,
    removeValue: (index) =>
      controls.setValue(controls.value.filter((_oldValue, oldIndex) => oldIndex !== index)),

  }

  newControls.canRemoveValue = (index: number) => {
    return ((props.minCount === undefined) ? controls.value.length > 0 : controls.value.length > props.minCount) &&
      (
        (props.canRemoveElement === undefined)
          ? true
          : props.canRemoveElement(index, newControls)
      )
  }

  return newControls
}