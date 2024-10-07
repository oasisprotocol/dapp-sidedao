import Tooltip from 'rc-tooltip'
import { FC, forwardRef } from 'react'
import { MarkdownCode } from '../../types'
import { MarkdownBlock } from '../Markdown'

type TooltipProps = Omit<Parameters<typeof Tooltip>[0], 'overlay'> & { overlay: MarkdownCode | undefined }

export const MaybeWithTooltip: FC<TooltipProps> = forwardRef((props, ref) => {
  const { overlay, ...rest } = props
  return overlay ? (
    <Tooltip {...rest} ref={ref} overlay={<MarkdownBlock code={overlay} />}>
      <span>{props.children}</span>
    </Tooltip>
  ) : (
    props.children
  )
})
