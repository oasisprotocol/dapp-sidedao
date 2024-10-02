import { FC, MouseEventHandler, useCallback } from 'react'
import { ClosedLockIcon } from './ClosedLockIcon'
import { IconProps } from '../../types'
import classes from './index.module.css'
import { designDecisions } from '../../constants/config'
import { MaybeWithTooltip } from '../Tooltip/MaybeWithTooltip'

export const RestrictedPollIcon: FC<
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

  if (designDecisions.hideRestrictedPollHaveAccessIndicator && hasAccess) return

  return (
    <MaybeWithTooltip
      overlay={`${explanation} ${
        hasAccess
          ? completed
            ? 'You had access.'
            : 'You have access.'
          : completed
            ? "You didn't have access."
            : "You don't have access."
      } ${canRetest ? 'Click to retry!' : ''}`}
    >
      <span className={canRetest ? classes.pointer : undefined} onClick={handleClick}>
        <ClosedLockIcon color={hasAccess ? 'green' : 'red'} {...rest} />
      </span>
    </MaybeWithTooltip>
  )
}
