/// <reference types="vite-plugin-svgr/client" />

import { FC } from 'react'
import HourGlassSvg from '@phosphor-icons/core/assets/bold/hourglass-low-bold.svg?react'
import { Icon } from '../Icon'
import { IconProps } from '../../types'

export const HourGlassIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <HourGlassSvg />
  </Icon>
)
