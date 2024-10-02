import Tooltip from 'rc-tooltip'
import { FC } from 'react'

type TooltipProps = Parameters<typeof Tooltip>[0]

export const MaybeWithTooltip: FC<TooltipProps> = props => {
  const { overlay } = props
  return overlay ? <Tooltip {...props} /> : props.children
}
