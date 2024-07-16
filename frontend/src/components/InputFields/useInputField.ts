import { useEffect, useState } from 'react';
import { AllProblems, getAsArray, ProblemAtLocation, ProblemReport, SingleOrArray, wrapProblem } from './util';

export type InputFieldProps<DataType> = {
  name: string;
  description?: string;
  label?: string;
  placeholder?: string;
  initialValue: DataType
  cleanUp?: (value: DataType) => DataType
  required?: boolean
  requiredMessage?: string
  validators?: SingleOrArray<undefined | ((value: DataType) => SingleOrArray<ProblemReport | string | undefined>)>
}

export type InputFieldControls<DataType> = Pick<InputFieldProps<DataType>, "label" | "description" | "placeholder" | "name"> & {
  value: DataType,
  setValue: (value: DataType) => void
  allProblems: AllProblems
  validate: () => boolean
  clearProblem: (id: string) => void
  clearProblemsAt: (location: string) => void
  clearAllProblems: () => void
}

type TypeTools<DataType> = {
  isEmpty: (data: DataType) => boolean
  isEqual: (data1: DataType, data2: DataType) => boolean
}

export function useInputField<DataType>(props: InputFieldProps<DataType>, typeControl: TypeTools<DataType>): InputFieldControls<DataType> {
  const { name, label, placeholder, description, initialValue, cleanUp, required, requiredMessage, validators = []} = props

  const [value, setValue] = useState<DataType>(initialValue)
  const [problems, setProblems] = useState<ProblemAtLocation[]>([])
  const [allProblems, setAllProblems] = useState<AllProblems>({})
  const { isEmpty, isEqual } = typeControl

  const validate = () : boolean => {
    const cleanValue = cleanUp ? cleanUp(value) : value
    const different = !isEqual(cleanValue, value)
    if (different) {
      setValue(cleanValue)
    }
    const currentProblems: (ProblemAtLocation | undefined)[] = []
    if (required && isEmpty(cleanValue)) {
      currentProblems.push(wrapProblem(requiredMessage ?? "This field is required", "root", "error"))
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
  }
}


