import { FC } from 'react'
import { ClosedLockIcon } from './ClosedLockIcon'
import { IconProps } from '../../types'

export const ClosedPollIcon: FC<
  IconProps & {
    explanation: string
    completed?: boolean
    hasAccess: boolean
  }
> = props => {
  const { explanation, hasAccess, completed, ...rest } = props
  return (
    <span
      title={`${explanation} ${
        hasAccess
          ? completed
            ? 'You had access.'
            : 'You have access.'
          : completed
            ? "You didn't have access."
            : "You don't have access."
      }`}
    >
      <ClosedLockIcon color={hasAccess ? 'green' : 'red'} {...rest} />
    </span>
  )
}
