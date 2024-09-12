/// <reference types="vite-plugin-svgr/client" />

import { FC } from 'react'
import imageUrl from '../../../public/broken_lock.png'
import { Icon } from '../Icon'
import { IconProps } from '../../types'

export const BrokenLockIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <img src={imageUrl} alt={'broken lock'} />
  </Icon>
)
