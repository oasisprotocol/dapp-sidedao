import { FC } from 'react'
import classes from './index.module.css'

const ActiveDot: FC = () => (
  <svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="6" cy="6.5" r="6" fill="#010038" />
  </svg>
)

const PassiveDot: FC = () => (
  <svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="6" cy="6.5" r="5.5" stroke="#010038" />
  </svg>
)

export const DottedProgressIndicator: FC<{
  steps: number
  currentStepIndex: number
}> = ({ steps, currentStepIndex }) => {
  return (
    <div className={classes.container}>
      {Array.from({ length: steps }).map((_i, index) =>
        index === currentStepIndex ? <ActiveDot key={index} /> : <PassiveDot key={index} />,
      )}
    </div>
  )
}
