import React, { ReactNode, useEffect, useRef } from 'react'
import { getAsArray } from '../components/InputFields'

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

export const deserializeReactElement = (input: any, key?: string): ReactNode => {
  if (typeof input === 'string') return input
  const { children = [], ...props } = input.props
  return React.createElement(
    input.type || 'span',
    { ...props, key },
    getAsArray(children).map((c, index) => deserializeReactElement(c, `child${index}`)),
  )
}
