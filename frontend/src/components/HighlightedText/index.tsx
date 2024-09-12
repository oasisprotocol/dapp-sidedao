import { findTextMatches, MatchInfo, NO_MATCH, NormalizerOptions, PositiveMatchInfo } from './text-matching'
import { CSSProperties, FC } from 'react'

export interface HighlightOptions {
  /**
   * Options for identifying the matches
   */
  findOptions?: NormalizerOptions

  /**
   * Which class to use for highlighting?
   *
   * Please don't supply both class and style together.
   */
  className?: string

  /**
   * Which styles to use for highlighting?
   *
   * Please don't supply both class and style together.
   */
  style?: CSSProperties
}

const defaultHighlightStyle: CSSProperties = {
  background: '#FFFF5480',
  padding: '2px',
  margin: '-2px',
}

const defaultHighlight: HighlightOptions = {
  style: defaultHighlightStyle,
}

interface HighlightedTextProps {
  /**
   * The text to display
   */
  text: string | undefined

  /**
   * The patterns to search for (and highlight)
   */
  patterns: (string | undefined)[]

  /**
   * Instructions about which part to highlight.
   *
   * If not given, we will just search for the pattern.
   * If given, this will be executed, and the pattern will not even be considered.
   */
  parts?: MatchInfo[]

  /**
   * Options for highlighting (case sensitivity, styling, etc.)
   *
   * (This is optional, sensible defaults are provided.)
   */
  options?: HighlightOptions
}

/**
 * Display a text, with potential pattern matches highlighted with html MARKs
 */
export const HighlightedText: FC<HighlightedTextProps> = ({
  text,
  patterns,
  parts,
  options = defaultHighlight,
}) => {
  const { style = defaultHighlightStyle, findOptions = {} } = options

  // Have we been told what to highlight exactly? If not, look for the pattern
  const tasks = parts ?? findTextMatches(text, patterns, findOptions)

  // Get the real matches
  const realTasks = tasks.filter((task): task is PositiveMatchInfo => task !== NO_MATCH)

  if (text === undefined) return undefined // Nothing to display
  if (!realTasks.length) return text // We don't have to highlight anything

  const task = realTasks[0]

  const beginning = text.substring(0, task.startPos)
  const focus = text.substring(task.startPos, task.endPos)
  const end = text.substring(task.endPos)

  return (
    <>
      {beginning}
      <mark style={style}>{focus}</mark>
      {end}
    </>
  )
}

const renderStyle = (style: CSSProperties): string => {
  return Array.from(Object.entries(style))
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n')
}

/**
 * Display a text, with potential pattern matches highlighted with html MARKs
 */
export const getHighlightedTextHtml = (props: HighlightedTextProps) => {
  const { text, patterns, parts, options = defaultHighlight } = props
  const { style = defaultHighlightStyle, findOptions = {} } = options

  const styleString = renderStyle(style)

  // Have we been told what to highlight exactly? If not, look for the pattern
  const tasks = parts ?? findTextMatches(text, patterns, findOptions)

  // Get the real matches
  const realTasks = tasks.filter((task): task is PositiveMatchInfo => task !== NO_MATCH)

  if (text === undefined) return undefined // Nothing to display
  if (!realTasks.length) return text // We don't have to highlight anything

  // const sortedTasks = realTasks.sort((a, b) =>
  //   a.startPos > b.startPos ? 1 : a.startPos < b.startPos ? -1 : 0,
  // )

  const task = realTasks[0]

  const beginning = text.substring(0, task.startPos)
  const focus = text.substring(task.startPos, task.endPos)
  const end = text.substring(task.endPos)

  return `${beginning}<mark style={${styleString}}>${focus}</mark>${end}`
}
