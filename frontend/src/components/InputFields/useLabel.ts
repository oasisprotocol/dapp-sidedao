import { InputFieldControls, InputFieldProps, useInputField } from './useInputField';
import { getAsArray, SingleOrArray } from './util';

type LabelProps = Pick<InputFieldProps<string>, 'name' | 'label' | 'description' | 'visible' | 'hidden' | 'initialValue' | 'containerClassName'> & {
  classnames?: SingleOrArray<string>
}

export type LabelControls = Pick<InputFieldControls<any>,
  'name' | 'label' | 'description' | 'type'
  | 'visible' | 'value' | 'setValue' | 'validate'
  | 'allProblems' | 'clearProblem' | 'clearAllProblems' | 'containerClassName'> & {
  classnames: string[]
}

export const useLabel = (props: LabelProps): LabelControls => {
  const { classnames = []} = props

  const controls = useInputField(
    "label",
    {
      ...props,
    }, {
      isEmpty: value => !value,
      isEqual: (a, b) => a === b,
    })

  return {
    ...controls,
    classnames: getAsArray(classnames)
  }

}
