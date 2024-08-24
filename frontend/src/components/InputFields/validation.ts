import { InputFieldControls } from './useInputField';
import { getAsArray, SingleOrArray } from './util';

type FieldLike = Pick<InputFieldControls<any>, 'name' | 'type' | 'visible' | 'validate'>

export type FieldConfiguration = SingleOrArray<FieldLike>[]

export const findErrorsInFields = async (fields: FieldConfiguration): Promise<boolean> => {
  const visibleFields = fields
    .flatMap(config => getAsArray(config))
    .filter(field => field.visible)
  let hasError = false
  for (const field of visibleFields) {
    const isFieldOK = await field.validate()
    hasError = hasError || !isFieldOK
  }
  return hasError
}