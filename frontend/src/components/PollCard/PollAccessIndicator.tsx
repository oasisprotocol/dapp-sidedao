import { FC, ReactNode } from 'react'
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
  hideRestrictedNoAccess?: boolean
  isPending: boolean
  isBroken: boolean
  explanation: ReactNode
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
  hideRestrictedNoAccess,
}) => {
  return (
    <>
      {isOpen && !designDecisions.hideOpenPollIndicator && (
        <OpenPollIcon completed={isCompleted} height={20} />
      )}
      {isRestricted && !(!hasAccess && hideRestrictedNoAccess) && (
        <RestrictedPollIcon
          explanation={explanation ?? 'unknown restriction'}
          completed={isCompleted}
          hasAccess={hasAccess}
          height={20}
          onClick={retest}
        />
      )}
      {isPending && <SpinnerIcon spinning height={32} overlay={'Checking access'} />}
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
  hideRestrictedNoAccess?: boolean
  retest: () => void
}> = ({ isMine, permissions, isActive, hideRestrictedNoAccess, retest }) => {
  const { explanation, error, canVote } = permissions
  return (
    <PollAccessIndicator
      isOpen={explanation === ''}
      isBroken={!!error}
      isRestricted={!!explanation && !error}
      hideRestrictedNoAccess={hideRestrictedNoAccess}
      explanation={explanation}
      hasAccess={getVerdict(canVote, false)}
      isCompleted={!isActive}
      isPending={explanation === undefined}
      isMine={isMine}
      retest={retest}
    />
  )
}
