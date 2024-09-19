import { FC } from 'react'
import { OpenPollIcon } from '../icons/OpenPollIcon'
import { RestrictedPollIcon } from '../icons/RestrictedPollIcon'
import { SpinnerIcon } from '../icons/SpinnerIcon'
import { BrokenPollAccessIcon } from '../icons/BrokenPollAccessIcon'
import { getVerdict } from '../InputFields'
import { PollPermissions } from '../../utils/poll.utils'
import { MyPollIcon } from '../icons/MyPollIcon'
import { designDecisions } from '../../constants/config'

export const PollAccessIndicator: FC<{
  isOpen: boolean
  isRestricted: boolean
  hideClosedNoAccess?: boolean
  isPending: boolean
  isBroken: boolean
  explanation: string | undefined
  hasAccess: boolean
  isCompleted: boolean
  isMine: boolean | undefined
  retest: () => void
}> = ({
  isOpen,
  isBroken,
  isRestricted,
  isPending,
  explanation,
  hasAccess,
  isCompleted,
  isMine,
  retest,
  hideClosedNoAccess,
}) => {
  return (
    <>
      {isOpen && !designDecisions.hideOpenPollIndicator && (
        <OpenPollIcon completed={isCompleted} height={20} />
      )}
      {isRestricted && !(!hasAccess && hideClosedNoAccess) && (
        <RestrictedPollIcon
          explanation={explanation ?? 'unknown restriction'}
          completed={isCompleted}
          hasAccess={hasAccess}
          height={20}
          onClick={retest}
        />
      )}
      {isPending && <SpinnerIcon spinning height={32} title={'Checking access'} />}
      {isBroken && <BrokenPollAccessIcon onClick={retest} />}
      {isMine && !designDecisions.hideMyPollIndicator && <MyPollIcon />}
      {/*<Button onClick={retest}>ASD</Button>*/}
    </>
  )
}

export const PollAccessIndicatorWrapper: FC<{
  isMine: boolean | undefined
  permissions: PollPermissions
  isActive: boolean
  hideClosedNoAccess?: boolean
  retest: () => void
}> = ({ isMine, permissions, isActive, hideClosedNoAccess, retest }) => {
  const { explanation, error, canVote } = permissions
  return (
    <PollAccessIndicator
      isOpen={explanation === ''}
      isBroken={!!error}
      isRestricted={!!explanation && !error}
      hideClosedNoAccess={hideClosedNoAccess}
      explanation={explanation}
      hasAccess={getVerdict(canVote, false)}
      isCompleted={!isActive}
      isPending={explanation === undefined}
      isMine={isMine}
      retest={retest}
    />
  )
}
