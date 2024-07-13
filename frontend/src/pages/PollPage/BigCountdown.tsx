import { FC } from 'react';
import { RemainingTime } from '../../hooks/usePollData';
import classes from "./index.module.css"

type Cell = {
  number: number,
  unit: string,
}

export const BigCountdown: FC<{
  remainingTime: RemainingTime
}> = ({remainingTime}) => {

  const wantedCells: Cell[] = []
  const hasDays = !!remainingTime.days
  const hasHours = hasDays || !!remainingTime.hours
  const hasMinutes = hasHours || !!remainingTime.minutes

  if (hasDays) wantedCells.push({number: remainingTime.days, unit: "days"})
  if (hasHours) wantedCells.push({number: remainingTime.hours, unit: "hours"})
  if (hasMinutes) wantedCells.push({number: remainingTime.minutes, unit: "minutes"})
  wantedCells.push({number: remainingTime.seconds, unit: "seconds"})
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