import { InputFieldControls, InputFieldProps, useInputField } from './useInputField'
import { getAsArray, SingleOrArray } from './util'
import { ReactNode } from 'react'

export type FormatterFunction<DataType> = (rawValue: DataType) => string

export type RendererFunction<DataType> = (rawValue: DataType) => ReactNode

export type LabelProps = Pick<
  InputFieldProps<string>,
  | 'name'
  | 'label'
  | 'description'
  | 'visible'
  | 'hidden'
  | 'containerClassName'
  | 'initialValue'
  | 'validators'
  | 'validateOnChange'
  | 'showValidationSuccess'
> & {
  classnames?: SingleOrArray<string>
  formatter?: FormatterFunction<string>
  renderer?: RendererFunction<string>
}

export type LabelControls = Omit<InputFieldControls<string>, 'placeholder' | 'enabled' | 'whyDisabled'> & {
  classnames: string[]
  formatter: FormatterFunction<string> | undefined
  renderer: RendererFunction<string> | undefined
}

export const useLabel = (props: LabelProps): LabelControls => {
  const { classnames = [], formatter, renderer } = props

  const controls = useInputField(
    'label',
    {
      ...props,
    },
    {
      isEmpty: value => !value,
      isEqual: (a, b) => a === b,
    },
  )

  return {
    ...controls,
    formatter,
    renderer,
    classnames: getAsArray(classnames),
  }
}
