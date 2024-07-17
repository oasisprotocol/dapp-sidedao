import { InputFieldControls } from './useInputField';
import { getAsArray, SingleOrArray } from './util';

export type FieldConfiguration = SingleOrArray<InputFieldControls<any>>[]

export const findErrorsInFields = (fields: FieldConfiguration): boolean =>
  !fields
    .flatMap(config => getAsArray(config))
    .filter(field => field.visible)
    .map(field => field.validate())
    .every(e => e)
