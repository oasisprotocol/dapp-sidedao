import { InputFieldControls, InputFieldProps, useInputField } from './useInputField';
import { getAsArray, SingleOrArray } from './util';

type LabelProps = Pick<InputFieldProps<string>, 'name' | 'label' | 'description' | 'visible' | 'hidden' | 'containerClassName'> & {
  classnames?: SingleOrArray<string>
  value: string
}

export type LabelControls = Pick<InputFieldControls<any>,
  'name' | 'label' | 'description' | 'type'
  | 'visible' | 'value' | 'setValue' | 'validate'
  | 'allProblems' | 'clearProblem' | 'clearAllProblems' | 'containerClassName'> & {
  classnames: string[]
}

export const useLabel = (props: LabelProps): LabelControls => {
  const { value, classnames = []} = props

  const controls = useInputField(
    "label",
    {
      ...props,
      initialValue: value,
    }, {
      isEmpty: value => !value,
      isEqual: (a, b) => a === b,
    })

  return {
    ...controls,
    value,
    classnames: getAsArray(classnames)
  }

}
