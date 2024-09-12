/// <reference types="vite-plugin-svgr/client" />

import { FC } from 'react'
import SpinnerSvg from '@phosphor-icons/core/assets/regular/spinner.svg?react'
import { Icon } from '../Icon'
import { IconProps } from '../../types'
import classes from './index.module.css'

export const SpinnerIcon: FC<IconProps & { spinning?: boolean; title?: string }> = ({
  size = 'large',
  spinning,
  title,
  ...restProps
}) => {
  const icon = (
    <Icon size={size} {...restProps}>
      <SpinnerSvg className={spinning ? classes.rotating : undefined} />
    </Icon>
  )
  return title ? <span title={title}>{icon}</span> : icon
}
