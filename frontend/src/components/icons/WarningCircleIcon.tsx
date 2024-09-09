/// <reference types="vite-plugin-svgr/client" />

import { FC } from 'react'
import WarningCircleSvg from '@phosphor-icons/core/assets/fill/warning-circle-fill.svg?react'
import { Icon } from '../Icon'
import { IconProps } from '../../types'

export const WarningCircleIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <WarningCircleSvg />
  </Icon>
)
