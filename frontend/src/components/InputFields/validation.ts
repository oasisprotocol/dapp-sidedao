import { InputFieldControls } from './useInputField';
import { getAsArray, SingleOrArray } from './util';

type FieldLike = Pick<InputFieldControls<any>, 'name' | 'type' | 'visible' | 'validate'>

export type FieldConfiguration = SingleOrArray<FieldLike>[]

export const findErrorsInFields = (fields: FieldConfiguration): boolean =>
  !fields
    .flatMap(config => getAsArray(config))
    .filter(field => field.visible)
    .map(field => field.validate())
    .every(e => e)
