import { FC } from 'react'
import { OpenPollIcon } from '../icons/OpenPollIcon'
import { ClosedPollIcon } from '../icons/ClosedPollIcon'
import { SpinnerIcon } from '../icons/SpinnerIcon'
import { BrokenPollAccessIcon } from '../icons/BrokenPollAccessIcon'
import { getVerdict } from '../InputFields'
import { useExtendedPoll } from '../../hooks/useExtendedPoll'

export const PollAccessIndicator: FC<{
  open: boolean
  closed: boolean
  pending: boolean
  broken: boolean
  explanation: string | undefined
  hasAccess: boolean
  completed: boolean
}> = ({ open, broken, closed, pending, explanation, hasAccess, completed }) => {
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
    </>
  )
}

export const PollAccessIndicatorWrapper: FC<
  Pick<ReturnType<typeof useExtendedPoll>, 'aclExplanation' | 'aclError' | 'canAclVote' | 'isActive'>
> = ({ aclError, aclExplanation, canAclVote, isActive }) => (
  <PollAccessIndicator
    open={aclExplanation === ''}
    broken={!!aclError}
    closed={!!aclExplanation && !aclError}
    explanation={aclExplanation}
    hasAccess={getVerdict(canAclVote)}
    completed={!isActive}
    pending={aclExplanation === undefined}
  />
)
