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

export type InputFieldProps<DataType> = {
  name: string;
  description?: string;
  label?: string;
  placeholder?: string;
  initialValue: DataType
  cleanUp?: (value: DataType) => DataType
  required?: CoupledData<boolean, string>;
  validatorsGenerator?: (values: DataType) => ValidatorBundle<DataType>;
  validators?: ValidatorBundle<DataType>;
  visible?: boolean,
  hidden?: boolean,
  enabled?: Decision,
  disabled?: Decision,
  containerClassName?: string,
}

export type InputFieldControls<DataType> = Pick<InputFieldProps<DataType>, "label" | "description" | "placeholder" | "name"> & {
  type: string,
  visible: boolean,
  enabled: boolean,
  whyDisabled?: string,
  containerClassName?: string,
  value: DataType,
  setValue: (value: DataType) => void
  allProblems: AllProblems
  validate: () => Promise<boolean>
  validationPending: boolean
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
  } = props

  const [required, requiredMessage] = expandCoupledData(
    props.required,
    [false, "This field is required"],
  )


  const [value, setValue] = useState<DataType>(initialValue)
  const [problems, setProblems] = useState<ProblemAtLocation[]>([])
  const [validationPending, setValidationPending] = useState(false)
  const [allProblems, setAllProblems] = useState<AllProblems>({})
  const { isEmpty, isEqual } = dataTypeControl

  const visible = calculateVisible(props);
  const enabled = calculateEnabled(props);

  const isEnabled = getVerdict(enabled);

  const validate = async () : Promise<boolean> => {

    // Clear any previous problems
    setProblems([])
    setValidationPending(true)

    // Clean up the value
    const cleanValue = cleanUp ? cleanUp(value) : value
    const different = !isEqual(cleanValue, value)
    if (different) {
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
      const validatorReport = hasError
        ? [] // If we already have an error, don't even bother with any more validators
        : await validator(cleanValue) // Execute the current validators

      getAsArray(validatorReport)  // Maybe we have a single report, maybe an array. Receive it as an array.
        .map(report => wrapProblem(report, "root", "error")) // Wrap single strings to proper reports
        .forEach(problem => { // Go through all the reports
          if (!problem) return
          if (problem.level === "error") hasError = true
          currentProblems.push(problem)
        })

    }

    setProblems(currentProblems)
    setValidationPending(false)

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


  return {
    type,
    name,
    description,
    label,
    placeholder,
    value,
    setValue: value => {
      // clearError();
      setValue(value)
    },
    allProblems,
    clearProblem,
    clearProblemsAt,
    clearAllProblems,

    validate,
    validationPending,
    visible,
    enabled: isEnabled,
    whyDisabled: isEnabled ? undefined : getReason(enabled),
    containerClassName,
  }
}


