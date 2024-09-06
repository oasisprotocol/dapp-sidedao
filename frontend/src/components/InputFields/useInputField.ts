import { useEffect, useState } from 'react';
import {
  AllProblems, CoupledData,
  Decision, expandCoupledData,
  getAsArray, getReason, getVerdict, invertDecision,
  ProblemAtLocation,
  SingleOrArray,
  ValidatorFunction,
  wrapProblem,
} from './util';

type ValidatorBundle<DataType> = SingleOrArray<undefined | ValidatorFunction<DataType>>

/**
 * Data type for describing a field
 */
export type InputFieldProps<DataType> = {
  name: string;
  description?: string;
  label?: string;
  placeholder?: string;
  initialValue: DataType

  /**
   * Optional function to normalize the value
   */
  cleanUp?: (value: DataType) => DataType

  /**
   * Is this field required?
   *
   * Optionally, you can also specify the corresponding error message.
   */
  required?: CoupledData<boolean, string>;

  validatorsGenerator?: (values: DataType) => ValidatorBundle<DataType>;

  /**
   * Validators to apply to values
   */
  validators?: ValidatorBundle<DataType>;

  /**
   * Should this field be shown?
   *
   * You can also use the "hidden" field for the same effect,
   * just avoid contradictory values.
   */
  visible?: boolean,

  /**
   * Should this field be hidden?
   *
   * You can also use the "visible" field for the same effect,
   * just avoid contradictory values.
   */
  hidden?: boolean,

  /**
   * Is this field enabled, that is, editable?
   *
   * Optionally, you can also specify why not.
   *
   * You can also use the "disabled" field for the same effect,
   * just avoid contradictory values.
   */
  enabled?: Decision,

  /**
   * Is this field disabled, that is, read only?
   *
   * Optionally, you can also specify why.
   *
   * You can also use the "enabled" field for the same effect,
   * just avoid contradictory values.
   */
  disabled?: Decision,

  /**
   * Extra classes to add to the container
   */
  containerClassName?: string,

  /**
   * Should this field be validated after every change?
   */
  validateOnChange?: boolean,

  /**
   * Besides errors, should we also indicate successful validation status?
   */
  showValidationSuccess?: boolean
}

/**
 * Data type passed from the field controller to the field UI widget
 */
export type InputFieldControls<DataType> = Pick<InputFieldProps<DataType>, "label" | "description" | "placeholder" | "name"> & {
  type: string,
  visible: boolean,
  enabled: boolean,
  whyDisabled?: string,
  containerClassName?: string,
  value: DataType,
  setValue: (value: DataType) => void
  allProblems: AllProblems
  hasProblems: boolean
  isValidated: boolean
  validate: () => Promise<boolean>
  validationPending: boolean
  indicateValidationSuccess: boolean
  clearProblem: (id: string) => void
  clearProblemsAt: (location: string) => void
  clearAllProblems: () => void
}

type DataTypeTools<DataType> = {
  isEmpty: (data: DataType) => boolean
  isEqual: (data1: DataType, data2: DataType) => boolean
}

const calculateVisible = (controls: Pick<InputFieldProps<any>, 'name' | 'hidden' | 'visible'>): boolean => {
  const {name, hidden,visible} = controls
  if (visible === undefined) {
    if (hidden === undefined) {
      return true
    } else {
      return !hidden
    }
  } else {
    if (hidden === undefined) {
      return visible
    } else {
      if (visible !== hidden) {
        return visible
      } else {
        throw new Error(`On field ${name}, props "hidden" and "visible" have been set to contradictory values!`)
      }
    }
  }
}

const calculateEnabled = (controls: Pick<InputFieldProps<any>, 'name' | 'enabled' | 'disabled'>): Decision => {
  const {name, enabled,disabled} = controls
  if (enabled === undefined) {
    if (disabled === undefined) {
      return true
    } else {
      return invertDecision(disabled)
    }
  } else {
    if (disabled === undefined) {
      return enabled
    } else {
      if (getVerdict(enabled) !== getVerdict(disabled)) {
        return {
          verdict: getVerdict(enabled),
          reason: getReason(disabled) ?? getReason(enabled),
        }
      } else {
        throw new Error(`On field ${name}, props "enabled" and "disabled" have been set to contradictory values!`)
      }
    }
  }
}

export function useInputField<DataType>(
  type: string,
  props: InputFieldProps<DataType>,
  dataTypeControl: DataTypeTools<DataType>
): InputFieldControls<DataType> {
  const {
    name, label, placeholder, description, initialValue,
    cleanUp,
    validators = [],
    validatorsGenerator,
    containerClassName,
    validateOnChange,
    showValidationSuccess = false,
  } = props

  const [required, requiredMessage] = expandCoupledData(
    props.required,
    [false, "This field is required"],
  )

  const [pristine, setPristine] = useState(true)
  const [value, setValue] = useState<DataType>(initialValue)
  const [problems, setProblems] = useState<ProblemAtLocation[]>([])
  const [isValidated, setIsValidated] = useState(false)
  const [lastValidatedData, setLastValidatedData] = useState<DataType | undefined>()
  const [validationPending, setValidationPending] = useState(false)
  const [allProblems, setAllProblems] = useState<AllProblems>({})
  const { isEmpty, isEqual } = dataTypeControl

  const visible = calculateVisible(props);
  const enabled = calculateEnabled(props);

  const isEnabled = getVerdict(enabled);

  const validate = async (preserve = false) : Promise<boolean> => {

    // Clear any previous problems
    setProblems([])
    setValidationPending(true)
    setIsValidated(false)

    // Clean up the value
    const cleanValue = cleanUp ? cleanUp(value) : value
    const different = !isEqual(cleanValue, value)
    if (different && !preserve) {
      setValue(cleanValue)
    }

    // Let's start to collect the new problems
    const currentProblems: ProblemAtLocation[] = []
    let hasError = false

    // If it's required but empty, that's already an error
    if (required && isEmpty(cleanValue)) {
      currentProblems.push(wrapProblem(requiredMessage, "root", "error")!)
      hasError = true
    }

    // Identify the user-configured validators to use
    const realValidators = getAsArray(validatorsGenerator ? validatorsGenerator(cleanValue) : validators)
      .filter((v): v is ValidatorFunction<DataType> => !!v)

    // Go through all the validators
    for (const validator of realValidators) {
      // Do we have anything to worry about from this validator?
      try {
        const validatorReport = hasError
          ? [] // If we already have an error, don't even bother with any more validators
          : await validator(cleanValue, lastValidatedData !== cleanValue) // Execute the current validators

        getAsArray(validatorReport)  // Maybe we have a single report, maybe an array. Receive it as an array.
          .map(report => wrapProblem(report, "root", "error")) // Wrap single strings to proper reports
          .forEach(problem => { // Go through all the reports
            if (!problem) return
            if (problem.level === "error") hasError = true
            currentProblems.push(problem)
          })
      } catch (validatorError) {
        console.log("Error while running validator", validatorError)
        currentProblems.push(wrapProblem(`Error while checking: ${validatorError + ""}`, "root", "error")!)
      }

    }

    setProblems(currentProblems)
    setValidationPending(false)
    setIsValidated(true)
    setLastValidatedData(cleanValue)

    // Do we have any actual errors?
    return !currentProblems.some(problem => problem.level === "error")
  }

  const clearProblem = (id: string) => {
    setProblems(problems.filter(p => p.id !== id))
  }

  const clearProblemsAt = (location: string): void => {
    setProblems(problems.filter(p => p.location !== location))
  }

  const clearAllProblems = () => {
    setProblems([])
  }

  useEffect(
    () => {
      const problemTree: AllProblems = {}
      problems.forEach(problem => {
        const {location} = problem
        let bucket = problemTree[location]
        if (!bucket) bucket = problemTree[location] = []
        const localProblem: ProblemAtLocation = { ...problem}
        delete (localProblem as any).location
        bucket.push(localProblem)
      })
      setAllProblems(problemTree)
    }, [problems]);

  useEffect(
    () => {
      if (visible && validateOnChange && !pristine) {
        void validate(true)
      }
    }, [visible, value, validateOnChange]
  )


  return {
    type,
    name,
    description,
    label,
    placeholder,
    value,
    setValue: newValue => {
      if (newValue === value) return
      setPristine(false)
      // clearError();
      setValue(newValue)
      setIsValidated(false)
    },
    allProblems,
    hasProblems: Object.keys(allProblems).some(key => allProblems[key].length),
    isValidated,
    clearProblem,
    clearProblemsAt,
    clearAllProblems,
    indicateValidationSuccess: showValidationSuccess,
    validate,
    validationPending,
    visible,
    enabled: isEnabled,
    whyDisabled: isEnabled ? undefined : getReason(enabled),
    containerClassName,
  }
}


