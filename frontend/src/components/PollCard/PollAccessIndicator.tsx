import { FC } from 'react'
import { OpenPollIcon } from '../icons/OpenPollIcon'
import { ClosedPollIcon } from '../icons/ClosedPollIcon'
import { SpinnerIcon } from '../icons/SpinnerIcon'
import { BrokenPollAccessIcon } from '../icons/BrokenPollAccessIcon'
import { getVerdict } from '../InputFields'
import { PollPermissions } from '../../utils/poll.utils'
import { MyPollIcon } from '../icons/MyPollIcon'

export const PollAccessIndicator: FC<{
  open: boolean
  closed: boolean
  pending: boolean
  broken: boolean
  explanation: string | undefined
  hasAccess: boolean
  completed: boolean
  mine: boolean | undefined
}> = ({ open, broken, closed, pending, explanation, hasAccess, completed, mine }) => {
  return (
    <>
      {open && <OpenPollIcon completed={completed} height={20} />}
      {closed && (
        <ClosedPollIcon
          explanation={explanation ?? 'unknown restriction'}
          completed={completed}
          hasAccess={hasAccess}
          height={20}
        />
      )}
      {pending && <SpinnerIcon spinning height={32} title={'Checking access'} />}
      {broken && <BrokenPollAccessIcon />}
      {mine && <MyPollIcon />}
    </>
  )
}

export const PollAccessIndicatorWrapper: FC<{ permissions: PollPermissions; isActive: boolean }> = ({
  permissions: { explanation, error, canVote, isMine },
  isActive,
}) => (
  <PollAccessIndicator
    open={explanation === ''}
    broken={!!error}
    closed={!!explanation && !error}
    explanation={explanation}
    hasAccess={getVerdict(canVote)}
    completed={!isActive}
    pending={explanation === undefined}
    mine={isMine}
  />
)
