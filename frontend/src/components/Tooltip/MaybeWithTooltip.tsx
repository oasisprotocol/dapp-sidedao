import Tooltip from 'rc-tooltip'
import { FC, forwardRef } from 'react'

type TooltipProps = Parameters<typeof Tooltip>[0]

export const MaybeWithTooltip: FC<TooltipProps> = forwardRef((props, ref) => {
  const { children, ...rest } = props
  return props.overlay ? (
    <Tooltip {...rest} ref={ref}>
      <span>{children}</span>
    </Tooltip>
  ) : (
    props.children
  )
})
