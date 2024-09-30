import { InputFieldControls, ValidationReason } from './useInputField'
import { AsyncValidatorFunction, getAsArray, SingleOrArray } from './util'
import { LabelProps } from './useLabel'

type FieldLike = Pick<InputFieldControls<any>, 'name' | 'type' | 'visible' | 'validate' | 'hasProblems'>

export type FieldConfiguration = SingleOrArray<FieldLike>[]

export const findErrorsInFields = async (
  fields: FieldConfiguration,
  reason: ValidationReason,
  isStillFresh: () => boolean,
): Promise<boolean> => {
  const visibleFields = fields.flatMap(config => getAsArray(config)).filter(field => field.visible)
  let hasError = false
  for (const field of visibleFields) {
    const isFieldOK = await field.validate({ reason, isStillFresh })
    hasError = hasError || !isFieldOK
  }
  return hasError
}

export const collectErrorsInFields = (fields: FieldConfiguration): boolean =>
  fields
    .flatMap(config => getAsArray(config))
    .filter(field => field.visible)
    .some(field => field.hasProblems)

const sleep = (time: number) => new Promise<string>(resolve => setTimeout(() => resolve(''), time))

const mockValidator: AsyncValidatorFunction<any> = async (_value, controls) => {
  if (!controls.isStillFresh()) return undefined
  await sleep(500)
  return undefined
}

export const addMockValidation: Partial<LabelProps> = {
  showValidationSuccess: true,
  validators: mockValidator,
  validateOnChange: true,
}
