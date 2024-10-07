/// <reference types="vite-plugin-svgr/client" />

import { FC } from 'react'
import SpinnerSvg from '@phosphor-icons/core/assets/regular/spinner.svg?react'
import { Icon } from '../Icon'
import { IconProps, MarkdownCode } from '../../types'
import classes from './index.module.css'
import { MaybeWithTooltip } from '../Tooltip/MaybeWithTooltip'

export const SpinnerIcon: FC<IconProps & { spinning?: boolean; overlay?: MarkdownCode }> = ({
  size = 'large',
  spinning,
  overlay,
  ...restProps
}) => {
  const icon = (
    <Icon size={size} {...restProps}>
      <SpinnerSvg className={spinning ? classes.rotating : undefined} />
    </Icon>
  )
  return <MaybeWithTooltip overlay={overlay}>{icon}</MaybeWithTooltip>
}
