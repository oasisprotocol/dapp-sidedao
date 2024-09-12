import { OpenLockIcon } from './OpenLockIcon'
import { FC } from 'react'
import { IconProps } from '../../types'

export const OpenPollIcon: FC<IconProps & { completed?: boolean }> = props => {
  const { completed, ...rest } = props
  return (
    <span
      title={
        completed ? 'This was an open poll; everyone could vote.' : 'This is an open poll; everyone can vote.'
      }
    >
      <OpenLockIcon {...rest} />
    </span>
  )
}
