import { FC } from 'react'
import { IconProps } from '../../types'
import { BrokenLockIcon } from './BrokenLockIcon'

export const BrokenPollAccessIcon: FC<IconProps> = props => {
  const { ...rest } = props
  return (
    <span title={'Currently there is a technical issue with the access control mechanism for this poll. '}>
      <BrokenLockIcon {...rest} />
    </span>
  )
}
