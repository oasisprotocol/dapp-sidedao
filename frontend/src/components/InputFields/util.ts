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

export const wrapProblem = (
  problem: string | ProblemReport | undefined,
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


export type AllProblems = Record<string, Problem[]>

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
