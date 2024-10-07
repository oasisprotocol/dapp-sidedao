import { MarkdownCode } from '../types'

export const getStrictLink = (props: { href: string; label: MarkdownCode }) =>
  `[${props.label as string}](${props.href})`

export const getLink = (props: { href: string | undefined; label: MarkdownCode }) =>
  props.label ? getStrictLink(props as any) : props.label
