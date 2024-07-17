import { InputFieldControls } from './useInputField';

export const findErrorsInFields = (fields: InputFieldControls<any>[]): boolean => {
  const isCorrect = fields
    .filter(field => field.visible)
    .map(field => field.validate())
  return !isCorrect.every(e => e)
}