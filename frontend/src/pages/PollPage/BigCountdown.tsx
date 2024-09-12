import { FC } from 'react'
import classes from './index.module.css'
import { RemainingTime } from '../../types'
import { StringUtils } from '../../utils/string.utils'

type Cell = {
  number: number
  unit: string
}

export const BigCountdown: FC<{
  remainingTime: RemainingTime
}> = ({ remainingTime }) => {
  const { days, hours, minutes, seconds } = remainingTime

  const wantedCells: Cell[] = []
  const hasDays = !!days
  const hasHours = hasDays || !!hours
  const hasMinutes = hasHours || !!minutes

  if (hasDays) wantedCells.push({ number: days, unit: StringUtils.maybePluralUnits(days, 'day', 'days') })
  if (hasHours)
    wantedCells.push({ number: hours, unit: StringUtils.maybePluralUnits(hours, 'hour', 'hours') })
  if (hasMinutes)
    wantedCells.push({ number: minutes, unit: StringUtils.maybePluralUnits(minutes, 'minute', 'minutes') })
  wantedCells.push({ number: seconds, unit: StringUtils.maybePluralUnits(seconds, 'second', 'seconds') })
  return (
    <div className={classes.countdownContainer}>
      {wantedCells.map(cell => (
        <div key={`cell-${cell.unit}`} className={classes.countdownCell}>
          <div className={classes.countdownNumber}>{cell.number}</div>
          <div className={classes.countdownUnit}>{cell.unit}</div>
        </div>
      ))}
    </div>
  )
}
