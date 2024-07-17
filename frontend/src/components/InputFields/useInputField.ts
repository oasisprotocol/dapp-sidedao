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

export type InputFieldProps<DataType> = {
  name: string;
  description?: string;
  label?: string;
  placeholder?: string;
  initialValue: DataType
  cleanUp?: (value: DataType) => DataType
  required?: CoupledData<boolean, string>;
  requiredMessage?: string
  validators?: SingleOrArray<undefined | ValidatorFunction<DataType>>,
  visible?: boolean,
  hidden?: boolean,
  enabled?: Decision,
  disabled?: Decision,
}

export type InputFieldControls<DataType> = Pick<InputFieldProps<DataType>, "label" | "description" | "placeholder" | "name"> & {
  type: string,
  visible: boolean,
  enabled: boolean,
  whyDisabled?: string,
  value: DataType,
  setValue: (value: DataType) => void
  allProblems: AllProblems
  validate: () => boolean
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
  } = props

  const [required, requiredMessage] = expandCoupledData(
    props.required,
    [false, "This field is required"],
  )


  const [value, setValue] = useState<DataType>(initialValue)
  const [problems, setProblems] = useState<ProblemAtLocation[]>([])
  const [allProblems, setAllProblems] = useState<AllProblems>({})
  const { isEmpty, isEqual } = dataTypeControl

  const visible = calculateVisible(props);
  const enabled = calculateEnabled(props);

  const isEnabled = getVerdict(enabled);

  const validate = () : boolean => {
    const cleanValue = cleanUp ? cleanUp(value) : value
    const different = !isEqual(cleanValue, value)
    if (different) {
      setValue(cleanValue)
    }
    const currentProblems: (ProblemAtLocation | undefined)[] = []
    if (required && isEmpty(cleanValue)) {
      currentProblems.push(wrapProblem(requiredMessage, "root", "error"))
    }
    getAsArray(validators).filter(v => !!v).forEach(validator => {
      const validatorReport = (validator!)(cleanValue)

      getAsArray(validatorReport).map(report => wrapProblem(report, "root", "error"))
        .forEach(problem => currentProblems.push(problem!))

    })
    const realProblems = currentProblems.filter(p => !!p) as ProblemAtLocation[]
    setProblems(realProblems)

    return !realProblems.some(problem => problem.level === "error")
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
    visible,
    enabled: isEnabled,
    whyDisabled: isEnabled ? undefined : getReason(enabled),
  }
}


