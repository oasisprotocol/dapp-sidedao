import { CSSProperties, FC, forwardRef, PropsWithChildren, SVGAttributes } from 'react'
import { motion } from 'framer-motion'

type MotionDivProps = Parameters<typeof motion.div>[0]

type CSSPropertiesWithoutTransitionOrSingleTransforms = Omit<
  CSSProperties,
  'transition' | 'rotate' | 'scale' | 'perspective'
>
type SVGTransformAttributes = {
  attrX?: number
  attrY?: number
  attrScale?: number
}

interface SVGPathProperties {
  pathLength?: number
  pathOffset?: number
  pathSpacing?: number
}

type TargetProperties = CSSPropertiesWithoutTransitionOrSingleTransforms &
  SVGAttributes<SVGElement> &
  SVGTransformAttributes &
  // TransformProperties &
  SVGPathProperties

type Target = Omit<TargetProperties, 'rotate'>

type AnimationPolicy =
  | { id: 'allowAll' }
  | { id: 'denyAll' }
  | { id: 'allow'; allow: string[] }
  | { id: 'deny'; deny: string[] }

let policy: AnimationPolicy = { id: 'denyAll' }
export const setAnimationPolicy = (newPolicy: AnimationPolicy) => (policy = newPolicy)

export const shouldAnimate = (reason: string | undefined): boolean => {
  switch (policy.id) {
    case 'allowAll':
      return true
    case 'denyAll':
      return false
    case 'allow':
      return !!reason && policy.allow.includes(reason)
    case 'deny':
      return !reason || !policy.deny.includes(reason)
    default:
      console.log('Warning: unknown animation policy', policy)
      return false
  }
}

export const MotionDiv: FC<
  PropsWithChildren<
    Omit<
      MotionDivProps,
      | 'style'
      | 'children'
      | 'onDrag'
      | 'onDragStart'
      | 'onDragEnd'
      | 'onAnimationStart'
      | 'initial'
      | 'animate'
    >
  > & {
    reason?: string | undefined
    initial?: Target
    animate?: Target
  }
> = forwardRef((props, ref) => {
  const { reason, ...motionProps } = props
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { layout, initial, animate, exit, ...divProps } = motionProps
  if (shouldAnimate(reason)) {
    return <motion.div {...motionProps} ref={ref} />
  } else {
    return <div {...divProps} style={{ ...(initial ?? {}), ...(animate ?? {}) }} />
  }
})
