export type { DataEntry } from './data-entry'
export type * from './poll'
export * from './poll-flags'
export type { IconSize } from './icon-size'
export type { IconProps } from './icon-props'

const md = Symbol('md')

/**
 * Markdown text
 *
 * This is basically just normal string with markdown code.
 * We are defining a type in order to avoid accidentally
 * passing Markdown to a component that accepts string and is
 * not equipped to handle markdown.
 *
 * So use this type to mark strings that can hold markdown.
 * Just use "as string" if you need the actual value.
 */
export type MarkdownCode = string | typeof md
