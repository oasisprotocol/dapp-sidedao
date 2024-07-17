export type ProblemLevel = "warning" | "error";

let idCounter = 0;

const getNewId = () => `problem-${idCounter++}`;

export type ProblemReport = {
  location?: string;
  message: string;
  level?: ProblemLevel;
}

export type Problem = {
  id: string;
  message: string;
  level: ProblemLevel;
}

export type ProblemAtLocation = Problem & { location: string }

type ValidatorProduct = ProblemReport | string | undefined

export const wrapProblem = (
  problem: ValidatorProduct,
  defaultLocation: string,
  defaultLevel: ProblemLevel,
): ProblemAtLocation | undefined =>
  (problem === undefined)
    ? undefined
    : ((typeof problem) === "string")
      ? {
        id: getNewId(),
        message: problem as string,
        level: defaultLevel,
        location: defaultLocation
      } : {
        id: getNewId(),
        message: (problem as ProblemReport).message,
        level: (problem as ProblemReport).level ?? "error",
        location: (problem as ProblemReport).location ?? defaultLocation,
      }

export function flatten<Data>(array: Data[][]): Data[] {
  const result: Data[] = []
  array.forEach(a => a.forEach(i => result.push(i)))
  return result;
}

export type AllProblems = Record<string, Problem[]>

export type ValidatorFunction<DataType> = (value: DataType) => SingleOrArray<ValidatorProduct>

export const checkProblems = (problems: Problem[] = []) => ({
  hasWarning: problems.some((problem) => problem.level === "warning"),
  hasError: problems.some((problem) => problem.level === "error"),
})

export type SingleOrArray<Data> = Data | Data[]

export function getAsArray<Data>(data: SingleOrArray<Data>): Data[] {
  return Array.isArray(data) ? data : [data]
}

export const thereIsOnly = (amount: number) => {
  if (!amount) {
    return "there is none"
  } else if (amount == 1) {
    return "there is only one"
  } else {
    return `there are only ${amount}`
  }
}

export const atLeastXItems = (amount: number): string => {
  if (amount > 1) {
    return `at least ${amount} items`
  } else if (amount === 1) {
    return `at least one item`
  } else {
    throw new Error(`What do you mean by 'at least ${amount} items??'`)
  }
}

type NumberStringFunction = (amount: number) => string
export type NumberMessageTemplate = string | NumberStringFunction

export const getNumberMessage = (template: NumberMessageTemplate, amount: number): string =>
  ((typeof template) === "string") ? (template as string) : ((template as NumberStringFunction)(amount))

/**
 * Get the indices of duplicate elements in an array
 */
export const findDuplicates = (values: string[], normalize?: (value: string) => string): number[] => {
  const matches: Record<string, number> = {}
  const duplicates = new Set<number>()
  values.forEach((value, index) => {
    const key = normalize ? normalize(value) : value
    if (matches[key] !== undefined) {
      duplicates.add(matches[value])
      duplicates.add(index)
    } else {
      matches[key] = index
    }
  })
  return Array.from(duplicates.values())
}

type SimpleDecision = boolean
type FullDecision = { verdict: boolean, reason?: string }
export type Decision = SimpleDecision | FullDecision

export const allow = (reason?: string ): Decision => ({ verdict: true, reason })

export const deny = (reason?: string ): Decision => ({ verdict: false, reason })

export const expandDecision = (decision: Decision): FullDecision =>
  (typeof decision === "boolean") ? { verdict: decision } : decision

export const invertDecision = (decision: Decision): Decision => {
  const {verdict, reason} = expandDecision(decision)
  return {
    verdict: !verdict,
    reason
  }
}

export const getVerdict = (decision: Decision | undefined, defaultVerdict = false): boolean =>
  (decision === undefined)
    ? defaultVerdict
    : (typeof decision === "boolean" ? decision : decision.verdict)

export const getReason = (decision: Decision | undefined ): string | undefined =>
  (decision === undefined)
    ? undefined
    : (typeof decision === "boolean") ? undefined : decision.reason

export const getReasonForDenial = (decision: Decision | undefined ): string | undefined =>
  (decision === undefined)
    ? undefined
    : ((typeof decision === "boolean") || decision.verdict)
      ? undefined
      : decision.reason

export const getReasonForAllowing = (decision: Decision | undefined ): string | undefined =>
  (decision === undefined)
    ? undefined
    : ((typeof decision === "boolean") || !decision.verdict)
      ? undefined
      : decision.reason


export type CoupledData<FirstType = boolean, SecondType = string> = [FirstType, SecondType] | FirstType

export function expandCoupledData<FirstType, SecondType>(
  value: CoupledData<FirstType, SecondType> | undefined,
  fallback: [FirstType, SecondType]
): [FirstType,  SecondType] {
  if (value === undefined) {
    return fallback;
  } else if (Array.isArray(value)) {
    return value;
  } else {
    return [value, fallback[1]];
  }
}
