import { FC } from 'react'
import classes from './index.module.css'
import { RemainingTime } from '../../types'
import { StringUtils } from '../../utils/string.utils'
import { AnimatePresence } from 'framer-motion'
import { MotionDiv } from '../../components/Animations'

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
          <AnimatePresence mode={'popLayout'}>
            <MotionDiv
              reason={'countdown'}
              className={classes.countdownNumber}
              key={`number-${cell.number}`}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
            >
              {cell.number}
            </MotionDiv>
            <div className={classes.countdownUnit}>{cell.unit}</div>
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
