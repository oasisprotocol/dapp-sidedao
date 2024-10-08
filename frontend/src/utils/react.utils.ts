import { useEffect, useRef } from 'react'

const usePrevious = (value: any, initialValue: any) => {
  const ref = useRef(initialValue)
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

/**
 * This is drop-in replacement for useEffect, with the added benefit of telling you which dependency has changed.
 */
export const useEffectDebugger = (effectHook: any, dependencies: any, dependencyNames = []) => {
  const previousDeps = usePrevious(dependencies, [])

  const changedDeps = dependencies.reduce((accum: any, dependency: any, index: number) => {
    if (dependency !== previousDeps[index]) {
      const keyName = dependencyNames[index] || index
      return {
        ...accum,
        [keyName]: {
          before: previousDeps[index],
          after: dependency,
        },
      }
    }

    return accum
  }, {})

  if (Object.keys(changedDeps).length) {
    console.log('[use-effect-debugger] ', changedDeps)
  }

  useEffect(effectHook, dependencies)
}
