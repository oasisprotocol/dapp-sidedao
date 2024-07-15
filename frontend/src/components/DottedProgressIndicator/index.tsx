import { FC } from 'react';

export const DottedProgressIndicator: FC<{
  steps: number,
  currentStepIndex: number,
}> = ({steps, currentStepIndex}) => {
  return (
    <div>
      Step { currentStepIndex + 1} of { steps }
    </div>
  )
}