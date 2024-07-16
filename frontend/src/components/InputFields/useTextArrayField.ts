import { InputFieldControls, InputFieldProps, useInputField } from './useInputField';
import { atLeastXItems, getAsArray, getNumberMessage, NumberMessageTemplate, thereIsOnly } from './util';

/**
 * Parameters for defining an input field that accepts a list of strings
 */
type TextArrayProps = Omit<InputFieldProps<string[]>, "initialValue"> & {
  // Initial values for all items
  initialValue?: string[]

  // Initial number of items
  initialItemCount?: number

  // Placeholders for all items
  placeholders?: string[]

  /**
   * Function to generate placeholders.
   *
   * Placeholders can be specified directly, or they
   * can be generated using this template function.
   */
  placeholderTemplate?: (index: number) => string,

  // Do we accept empty items?
  allowEmptyItems?: boolean

  // What error message to give on empty items?
  noEmptyItemMessage?: string

  // Minimum number of items
  minItemCount?: number,

  /**
   * Error message for when there are too few items
   *
   * You can provide a string, or a function that can
   * return a string, including the specified minimum amount.
   */
  tooFewItemsMessage?: NumberMessageTemplate;

  // Maximum number of items
  maxItemCount?: number,

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
  addItemLabel?: string,

  // Label for removing items
  removeItemLabel?: string,

  // Logic to determine whether an item can be removed
  canRemoveItem?: (index: number, me: TextArrayControls) => boolean
}

export type TextArrayControls = InputFieldControls<string[]> & {
  numberOfItems: number

  setItem: (index: number, value: string) => void
  placeholders: string[]

  canAddItem: boolean;
  addItemLabel: string;
  addItem: () => void

  canRemoveItem: (index: number) => boolean
  removeItemLabel: string
  removeItem: (index: number) => void
}

export function useTextArrayField(props: TextArrayProps): TextArrayControls {
  const {
    addItemLabel= "Add",
    removeItemLabel= "Remove",
    minItemCount = 3,
    initialItemCount,
    placeholderTemplate,
    tooFewItemsMessage = amount => `Please specify ${atLeastXItems(amount)}!`,
    maxItemCount,
    tooManyItemsMessage = amount => `Please specify at most ${amount} items.`,
    allowEmptyItems,
    noEmptyItemMessage = "Please either fill this in, or remove this option.",
    minLength,
    tooShortItemMessage = minLength => `Please specify at least ${minLength} characters.`,
    maxLength,
    tooLongItemMessage = maxLength => `Please don't use more than ${maxLength} characters.`,
    validators = [],
  } = props;
  const {
    initialValue =  [...Array(initialItemCount ?? minItemCount).keys()].map(
      (_ , _index) => ""
    ),
    placeholders,
  } = props

  const controls = useInputField<string[]>(
    "text-array",
    {
    ...props,
    initialValue,
    cleanUp: (values) => values.map(s => s.trim()),
    validators: [

      // No empty elements, please
      allowEmptyItems ? undefined : (values) => values.map((value, index) => value ? undefined : {
        message: noEmptyItemMessage,
        location: `value-${index}`,
      }),

      // Do we have enough elements?
      minItemCount
        ? (values => {
            const currentCount = values.filter(v => !!v).length
            return (currentCount < minItemCount)
              ? `${getNumberMessage(tooFewItemsMessage, minItemCount)} (Currently, ${thereIsOnly(currentCount)}.)`
              : undefined
          }
        ) : undefined,

      // Do we have too many elements?
      maxItemCount
        ? (values => {
            const currentCount = values.filter(v => !!v).length
            return (currentCount > maxItemCount)
              ? `${getNumberMessage(tooManyItemsMessage, maxItemCount)} (Currently, there are ${currentCount}.)`
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

      ...getAsArray(validators),
    ],
  }, {
    isEmpty: (value) => !value.length,
    isEqual: (a, b) => a.join("-") === b.join("-"),
  })

  const newControls: TextArrayControls = {
    ...controls,
    placeholders: placeholders ?? [...Array( controls.value.length).keys()].map(
      (_ , index) => placeholderTemplate ? placeholderTemplate(index) : ""
    ),
    numberOfItems: controls.value.length,
    setItem: (index, value) => {
      controls.clearProblemsAt(`value-${index}`)
      controls.setValue(controls.value.map((oldValue, oldIndex) => (oldIndex === index ? value : oldValue)))
    },
    canAddItem: !maxItemCount || controls.value.length < maxItemCount,
    addItemLabel: addItemLabel,
    addItem: () => {
      controls.clearAllProblems()
      controls.setValue([...controls.value, ""])
    },
    canRemoveItem: () => false, // This will be overwritten
    removeItemLabel: removeItemLabel,
    removeItem: (index) => {
      controls.clearAllProblems()
      controls.setValue(controls.value.filter((_oldValue, oldIndex) => oldIndex !== index))
    },

  }

  newControls.canRemoveItem = (index: number) => {
    return ((minItemCount === undefined) ? controls.value.length > 0 : controls.value.length > minItemCount) &&
      (
        (props.canRemoveItem === undefined)
          ? true
          : props.canRemoveItem(index, newControls)
      )
  }

  return newControls
}