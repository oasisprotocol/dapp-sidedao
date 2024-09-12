/// <reference types="vite-plugin-svgr/client" />

import { FC } from 'react'
import ClosedLockSvg from '@phosphor-icons/core/assets/bold/lock-bold.svg?react'
import { Icon } from '../Icon'
import { IconProps } from '../../types'

export const ClosedLockIcon: FC<IconProps & { color?: string }> = props => {
  const { color, ...rest } = props
  return (
    <Icon {...rest}>
      <ClosedLockSvg fill={color} />
    </Icon>
  )
}
