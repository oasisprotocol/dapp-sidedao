import { FC } from 'react'
import { OpenPollIcon } from '../icons/OpenPollIcon'
import { ClosedPollIcon } from '../icons/ClosedPollIcon'
import { SpinnerIcon } from '../icons/SpinnerIcon'
import { BrokenPollAccessIcon } from '../icons/BrokenPollAccessIcon'
import { getVerdict } from '../InputFields'
import { PollPermissions } from '../../utils/poll.utils'
import { MyPollIcon } from '../icons/MyPollIcon'

export const PollAccessIndicator: FC<{
  isOpen: boolean
  isClosed: boolean
  isPending: boolean
  isBroken: boolean
  explanation: string | undefined
  hasAccess: boolean
  isCompleted: boolean
  isMine: boolean | undefined
  retest: () => void
}> = ({ isOpen, isBroken, isClosed, isPending, explanation, hasAccess, isCompleted, isMine, retest }) => {
  return (
    <>
      {isOpen && <OpenPollIcon completed={isCompleted} height={20} />}
      {isClosed && (
        <ClosedPollIcon
          explanation={explanation ?? 'unknown restriction'}
          completed={isCompleted}
          hasAccess={hasAccess}
          height={20}
          onClick={retest}
        />
      )}
      {isPending && <SpinnerIcon spinning height={32} title={'Checking access'} />}
      {isBroken && <BrokenPollAccessIcon onClick={retest} />}
      {isMine && <MyPollIcon />}
      {/*<Button onClick={retest}>ASD</Button>*/}
    </>
  )
}

export const PollAccessIndicatorWrapper: FC<{
  permissions: PollPermissions
  isActive: boolean
  retest: () => void
}> = ({ permissions, isActive, retest }) => {
  const { explanation, error, canVote, isMine } = permissions
  return (
    <PollAccessIndicator
      isOpen={explanation === ''}
      isBroken={!!error}
      isClosed={!!explanation && !error}
      explanation={explanation}
      hasAccess={getVerdict(canVote)}
      isCompleted={!isActive}
      isPending={explanation === undefined}
      isMine={isMine}
      retest={retest}
    />
  )
}
