/// <reference types="vite-plugin-svgr/client" />

import { FC } from 'react'
import OpenLockSvg from '@phosphor-icons/core/assets/bold/lock-open-bold.svg?react'
import { Icon } from '../Icon'
import { IconProps } from '../../types'

export const OpenLockIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <OpenLockSvg />
  </Icon>
)
