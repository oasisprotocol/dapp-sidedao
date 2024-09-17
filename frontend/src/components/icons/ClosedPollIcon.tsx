import { FC, MouseEventHandler, useCallback } from 'react'
import { ClosedLockIcon } from './ClosedLockIcon'
import { IconProps } from '../../types'
import classes from './index.module.css'
import { designDecisions } from '../../constants/config'

export const ClosedPollIcon: FC<
  IconProps & {
    explanation: string
    completed?: boolean
    hasAccess: boolean
    onClick: () => void
  }
> = props => {
  const { explanation, hasAccess, completed, onClick, ...rest } = props
  const canRetest = !completed && !hasAccess
  const handleClick: MouseEventHandler<HTMLSpanElement> = useCallback(
    event => {
      event.preventDefault()
      if (canRetest) onClick()
    },
    [canRetest, onClick],
  )

  if (designDecisions.hideClosePollHaveAccessIndicator && hasAccess) return

  return (
    <span
      className={canRetest ? classes.pointer : undefined}
      title={`${explanation} ${
        hasAccess
          ? completed
            ? 'You had access.'
            : 'You have access.'
          : completed
            ? "You didn't have access."
            : "You don't have access."
      } ${canRetest ? 'Click to retry!' : ''}`}
      onClick={handleClick}
    >
      <ClosedLockIcon color={hasAccess ? 'green' : 'red'} {...rest} />
    </span>
  )
}
