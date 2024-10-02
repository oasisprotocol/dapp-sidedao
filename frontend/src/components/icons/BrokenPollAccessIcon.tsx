import { FC, MouseEventHandler, useCallback } from 'react'
import { IconProps } from '../../types'
import { BrokenLockIcon } from './BrokenLockIcon'
import classes from './index.module.css'
import { MaybeWithTooltip } from '../Tooltip/MaybeWithTooltip'

export const BrokenPollAccessIcon: FC<IconProps & { onClick: () => void }> = props => {
  const { onClick, ...rest } = props
  const handleClick: MouseEventHandler<HTMLSpanElement> = useCallback(
    event => {
      event.preventDefault()
      onClick()
    },
    [onClick],
  )
  return (
    <MaybeWithTooltip
      overlay={
        'Currently there is a technical issue with the access control mechanism for this poll. Click to retry.'
      }
    >
      <span className={classes.pointer} onClick={handleClick}>
        <BrokenLockIcon {...rest} />
      </span>
    </MaybeWithTooltip>
  )
}
