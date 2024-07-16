import { InputFieldControls, InputFieldProps, useInputField } from './useInputField';
import { getNumberMessage, NumberMessageTemplate, thereIsOnly } from './util';

/**
 * Parameters for defining an input field that accepts a list of strings
 */
type TextArrayProps = Omit<InputFieldProps<string[]>, "initialValue"> & {
  // Initial values for all fields
  initialValue?: string[]

  // Placeholders for all fields
  placeholders?: string[]

  /**
   * Function to generate placeholders.
   *
   * Placeholders can be specified directly, or they
   * can be generated using this template function.
   */
  placeholderTemplate?: (index: number) => string,

  // Do we accept empty items?
  allowEmpty?: boolean

  // What error message to give on empty items?
  noEmptyMessage?: string

  // Minimum count of entries
  minCount?: number,

  /**
   * Error message for when there are too few items
   *
   * You can provide a string, or a function that can
   * return a string, including the specified minimum amount.
   */
  tooFewItemsMessage?: NumberMessageTemplate;

  // Maximum count of entries
  maxCount?: number,

  /**
   * Error message for when there are too many items
   *
   * You can provide a string, or a function that can
   * return a string, including the specified maximum amount.
   */
  tooManyItemsMessage?: NumberMessageTemplate

  // Minimum length of each item
  minLength?: number

  /**
   * Error message for when an item is too short
   *
   * You can provide a string, or a function that can
   * return a string, including the specified minimum length.
   */
  tooShortItemMessage?: NumberMessageTemplate

  // Maximum length of each item
  maxLength?: number

  /**
   * Error message for when an item is too long
   *
   * You can provide a string, or a function that can
   * return a string, including the specified maximum length.
   */
  tooLongItemMessage?: NumberMessageTemplate

  // Label for adding more items
  addLabel?: string,

  // Label for removing items
  removeLabel?: string,

  // Logic to determine if an item can be removed
  canRemoveElement?: (index: number, me: TextArrayControls) => boolean
}

export type TextArrayControls = InputFieldControls<string[]>
  // & Pick<TextArrayProps, "addLabel" | "removeLabel">
  & {
  numberOfValues: number

  setSpecificValue: (index: number, value: string) => void
  placeholders: string[]

  canAddValue: boolean;
  addLabel: string;
  addValue: () => void

  canRemoveValue: (index: number) => boolean
  removeLabel: string
  removeValue: (index: number) => void
}

export function useTextArrayField(props: TextArrayProps): TextArrayControls {
  const {
    addLabel= "Add",
    removeLabel= "Remove",
    minCount,
    tooFewItemsMessage = amount => `Please specify at least ${amount} items.`,
    maxCount,
    tooManyItemsMessage = amount => `Please specify at most ${amount} items.`,
    allowEmpty,
    noEmptyMessage = "Please either fill this in, or remove this option.",
    minLength,
    tooShortItemMessage = minLength => `Please specify at least ${minLength} characters.`,
    maxLength,
    tooLongItemMessage = maxLength => `Please don't use more than ${maxLength} characters.`,
  } = props;
  const initialValue = props.initialValue ?? [...Array(props.minCount ?? 3).keys()].map(
    (_ , _index) => ""
  )

  const controls = useInputField<string[]>({
    ...props,
    initialValue,
    cleanUp: (values) => values.map(s => s.trim()),
    validators: [

      // No empty elements, please
      allowEmpty ? undefined : (values) => values.map((value, index) => value ? undefined : {
        message: noEmptyMessage,
        location: `value-${index}`,
      }),

      // Do we have enough elements?
      minCount
        ? (values => {
            const currentCount = values.filter(v => !!v).length
            return (currentCount < minCount)
              ? `${getNumberMessage(tooFewItemsMessage, minCount)} (Currently, ${thereIsOnly(currentCount)}.)`
              : undefined
          }
        ) : undefined,

      // Do we have too many elements?
      maxCount
        ? (values => {
            const currentCount = values.filter(v => !!v).length
            return (currentCount > maxCount)
              ? `${getNumberMessage(tooManyItemsMessage, maxCount)} (Currently, there are ${currentCount}.)`
              : undefined
          }
        ) : undefined,

      // Check minimum length on all items
      minLength
        ? (values => values.map((value, index) => (!!value && value.length < minLength) ? {
            message: `${getNumberMessage(tooShortItemMessage, minLength)} (Currently: ${value.length})`,
            location: `value-${index}`,
          } : undefined)
        ) : undefined,

      // Check maximum length on all items
      maxLength
        ? (values => values.map((value, index) => (!!value && value.length > maxLength) ? {
            message: `${getNumberMessage(tooLongItemMessage, maxLength)} (Currently: ${value.length})`,
            location: `value-${index}`,
          } : undefined)
        ) : undefined,

      // TODO
    ],
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
    setSpecificValue: (index, value) => {
      controls.clearProblemsAt(`value-${index}`)
      controls.setValue(controls.value.map((oldValue, oldIndex) => (oldIndex === index ? value : oldValue)))
    },
    canAddValue: !props.maxCount || controls.value.length < props.maxCount,
    addLabel,
    addValue: () => {
      controls.clearAllProblems()
      controls.setValue([...controls.value, ""])
    },
    canRemoveValue: () => false, // This will be overwritten
    removeLabel,
    removeValue: (index) => {
      controls.clearAllProblems()
      controls.setValue(controls.value.filter((_oldValue, oldIndex) => oldIndex !== index))
    },

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