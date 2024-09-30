import { FC, useCallback } from 'react'
import classes from './index.module.css'
import { Button } from '../../components/Button'
import { PollData } from './hook'
import { GasRequiredIcon } from '../../components/icons/GasRequiredIcon'
import { NoGasRequiredIcon } from '../../components/icons/NoGasRequiredIcon'
import { abbrAddr } from '../../utils/crypto.demo'
import { formatEther, parseEther } from 'ethers'
import { ConnectWallet } from '../../components/ConnectWallet'
import { Card } from '../../components/Card'
import { SocialShares } from '../../components/SocialShares'
import { getVerdict, getReason } from '../../components/InputFields'
import { WarningCircleIcon } from '../../components/icons/WarningCircleIcon'
import { PollAccessIndicatorWrapper } from '../../components/PollCard/PollAccessIndicator'
import { designDecisions } from '../../constants/config'
import { SpinnerIcon } from '../../components/icons/SpinnerIcon'
import { AnimatePresence } from 'framer-motion'
import { MotionDiv } from '../../components/Animations'

export const ActivePoll: FC<PollData> = ({
  hasWallet,
  hasWalletOnWrongNetwork,
  poll,
  remainingTime,
  remainingTimeString,
  selectedChoice,
  canSelect,
  setSelectedChoice,
  gaslessEnabled,
  gaslessPossible,
  gvAddresses,
  gvBalances,
  vote,
  canVote,
  isVoting,
  isMine,
  permissions,
  permissionsPending,
  checkPermissions,
  canComplete,
  isCompleting,
  canDestroy,
  completePoll,
  isDestroying,
  destroyPoll,
  topUp,
}) => {
  // console.log("hasWallet?", hasWallet, "hasWalletOnWrongNetwork?",hasWalletOnWrongNetwork)
  // console.log('isMine?', isMine, 'canComplete?', canComplete)

  const {
    name,
    description,
    choices,
    options: { publishVotes },
  } = poll!.ipfsParams

  const handleSelect = useCallback(
    (index: number) => {
      if (canSelect) {
        if (selectedChoice === BigInt(index)) {
          void setSelectedChoice(undefined)
        } else {
          void setSelectedChoice(BigInt(index))
        }
      }
    },
    [canSelect, selectedChoice, setSelectedChoice],
  )

  const handleComplete = useCallback(() => {
    if (canComplete && window.confirm("Are you sure you want to complete this poll? This can't be undone.")) {
      void completePoll()
    }
  }, [canComplete, completePoll])

  const handleDestroy = useCallback(() => {
    if (canDestroy && window.confirm("Are you sure you want to destroy this poll? This can't be undone.")) {
      void destroyPoll()
    }
  }, [canDestroy, destroyPoll])

  const handleTopup = (address: string) => {
    const amountString = window.prompt(
      `Topup voting subsidy account:\n\n  ${address}\n\nAmount (in ROSE):`,
      '1',
    )
    if (!amountString) return
    const amount = parseEther(amountString)
    if (amount > 0n) {
      // console.log("Should topup", address, amount)
      void topUp(address, amount)
    }
  }

  const isPastDue = !!remainingTime?.isPastDue

  const { canVote: canAclVote, explanation: aclExplanation } = permissions

  // console.log("selected:", selectedChoice, "can select?", canSelect, "can Vote?", canVote, "voting?", isVoting)
  return (
    <Card className={classes.darkCard}>
      <h2>
        <div className={'niceLine'}>
          {name}
          <PollAccessIndicatorWrapper
            isMine={isMine}
            permissions={permissions}
            isActive={true}
            retest={checkPermissions}
            hideRestrictedNoAccess={true}
          />
        </div>
      </h2>
      <h4>{description}</h4>

      {(hasWallet || isPastDue) && (
        <AnimatePresence initial={false}>
          {choices.map((choice, index) =>
            !isVoting || selectedChoice === BigInt(index) ? (
              <MotionDiv
                reason={'voting'}
                layout
                animate={{ opacity: 1, height: 48, width: '100%' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5 }}
                key={`choice-${index}`}
                className={`${classes.choice} ${classes.darkChoice} ${canSelect ? classes.activeChoice : ''} ${selectedChoice?.toString() === index.toString() ? classes.selectedChoice : ''}`}
                onClick={() => handleSelect(index)}
              >
                <div className={classes.above}>{choice}</div>
                {!designDecisions.showSubmitButton && isVoting && <SpinnerIcon spinning height="30" />}
              </MotionDiv>
            ) : undefined,
          )}
        </AnimatePresence>
      )}
      {!isPastDue &&
        !hasWallet &&
        (hasWalletOnWrongNetwork ? (
          <div className={classes.needWallet}>
            To vote on this poll, please <b>point your wallet to the Oasis network</b> by clicking the
            &quot;Switch Network&quot; button. This will open your wallet, and let you confirm that you want
            to connect to the Oasis Sapphire network. Ensure you have enough ROSE for any transaction fees.
          </div>
        ) : (
          <div className={classes.needWallet}>
            To vote on this poll, please <b>connect your wallet</b> by clicking the &quot;Connect Wallet&quot;
            button. This will open your wallet, and let you confirm the connection, and also point your wallet
            to the Oasis Sapphire network. Ensure you have enough ROSE for any transaction fees.
          </div>
        ))}
      {remainingTimeString && <h4>{remainingTimeString}</h4>}
      {publishVotes && <div>Votes will be made public when the poll is completed.</div>}
      {isPastDue && (
        <h4>
          Voting results will be available when {isMine ? 'you complete' : 'the owner formally completes'} the
          poll.
        </h4>
      )}
      {hasWallet && !hasWalletOnWrongNetwork && !getVerdict(canAclVote, false) ? (
        <AnimatePresence>
          {!permissionsPending && (
            <MotionDiv
              reason={'permissionWarning'}
              key={'warning-icon'}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <WarningCircleIcon size={'large'} />
            </MotionDiv>
          )}
          <MotionDiv
            reason={'permissionWarning'}
            key={'warning-message'}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <h4>You can&apos;t vote on this poll, since {getReason(canAclVote)}.</h4>
          </MotionDiv>
        </AnimatePresence>
      ) : (
        aclExplanation && (
          <>
            <h4>{aclExplanation}</h4>
            {getVerdict(canAclVote, false) && <h4>You have access.</h4>}
          </>
        )
      )}
      <div className={classes.buttons}>
        {hasWallet && getVerdict(canAclVote, false) && !isPastDue && (
          <div className={'niceLine'}>
            {gaslessPossible ? (
              designDecisions.hideGaslessIndicator ? undefined : (
                <NoGasRequiredIcon />
              )
            ) : (
              <GasRequiredIcon />
            )}
            {designDecisions.showSubmitButton && (
              <Button disabled={!canVote} onClick={() => vote()} pending={isVoting}>
                {isVoting ? 'Submitting' : 'Submit vote'}
              </Button>
            )}
          </div>
        )}
        {isMine && hasWallet && !hasWalletOnWrongNetwork && (
          <>
            <Button
              size={'small'}
              disabled={!canComplete}
              color={isMine && isPastDue ? 'primary' : 'secondary'}
              onClick={handleComplete}
              pending={isCompleting}
            >
              {isCompleting ? 'Completing poll' : 'Complete poll'}
            </Button>
            <Button
              size={'small'}
              disabled={!canDestroy}
              color={'secondary'}
              onClick={handleDestroy}
              pending={isDestroying}
            >
              {isDestroying ? 'Destroying poll' : 'Destroy poll'}
            </Button>
          </>
        )}
        {!hasWallet && !isPastDue && <ConnectWallet mobileSticky={false} />}
      </div>
      {isMine && gaslessEnabled && (
        <div>
          <h4>Gasless voting enabled:</h4>
          <div>
            {gvAddresses.map((address, index) => (
              <div key={`gvAddress-${index}`} className={'niceLine'}>
                {`${abbrAddr(address)} (${formatEther(gvBalances[index])} ROSE)`}
                {!isPastDue && (
                  <Button
                    data-address={address}
                    size={'small'}
                    color={'secondary'}
                    onClick={() => handleTopup(address)}
                  >
                    Topup
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <SocialShares
        label={'Share poll on'}
        className="socialOnDark"
        name={name}
        introText={'Vote here!'}
        pageTitle={name}
      />
    </Card>
  )
}
