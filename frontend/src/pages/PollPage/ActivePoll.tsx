import { FC, useCallback } from 'react'
import classes from './index.module.css'
import { Button } from '../../components/Button'
import { PollData } from './hook'
import { MyPollIcon } from '../../components/icons/MyPollIcon'
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

export const ActivePoll: FC<PollData> = ({
  hasWallet,
  hasWalletOnWrongNetwork,
  poll,
  remainingTime,
  remainingTimeString,
  selectedChoice,
  canSelect,
  setSelectedChoice,
  canAclVote,
  aclExplanation,
  aclError,
  canVote,
  gaslessEnabled,
  gaslessPossible,
  gvAddresses,
  gvBalances,
  vote,
  isVoting,
  isMine,
  canClose,
  isClosing,
  closePoll,
  topUp,
}) => {
  // console.log("hasWallet?", hasWallet, "hasWalletOnWrongNetwork?",hasWalletOnWrongNetwork)
  // console.log("isMine?", isMine, "canClose?", canClose)

  const {
    name,
    description,
    choices,
    creator,
    options: { publishVotes },
  } = poll!.ipfsParams

  const handleSelect = useCallback(
    (index: number) => {
      if (canSelect) {
        if (selectedChoice === BigInt(index)) {
          setSelectedChoice(undefined)
        } else {
          setSelectedChoice(BigInt(index))
        }
      }
    },
    [canSelect, selectedChoice, setSelectedChoice],
  )

  const handleClose = useCallback(() => {
    if (canClose && window.confirm("Are you sure you want to close this poll? This can't be undone.")) {
      void closePoll()
    }
  }, [close])

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

  // console.log("selected:", selectedChoice, "can select?", canSelect, "can Vote?", canVote, "voting?", isVoting)
  return (
    <Card className={classes.darkCard}>
      <h2>
        <div className={'niceLine'}>
          {name}
          <PollAccessIndicatorWrapper
            aclExplanation={aclExplanation}
            isActive={true}
            canAclVote={canAclVote}
            aclError={aclError}
          />
          {isMine && <MyPollIcon creator={creator} />}
        </div>
      </h2>
      <h4>{description}</h4>

      {(hasWallet || isPastDue) &&
        choices.map((choice, index) => (
          <div
            key={`choice-${index}`}
            className={`${classes.choice} ${classes.darkChoice} ${canSelect ? classes.activeChoice : ''} ${selectedChoice?.toString() === index.toString() ? classes.selectedChoice : ''}`}
            onClick={() => handleSelect(index)}
          >
            <div className={classes.above}>{choice}</div>
          </div>
        ))}
      {!isPastDue &&
        !hasWallet &&
        (hasWalletOnWrongNetwork ? (
          <div className={classes.needWallet}>
            To vote on this poll, please <b>point your wallet to the Oasis network</b> by clicking the "Switch
            Network" button. This will open your wallet, and let you confirm that you want to connect to the
            Oasis Sapphire network. Ensure you have enough ROSE for any transaction fees.
          </div>
        ) : (
          <div className={classes.needWallet}>
            To vote on this poll, please <b>connect your wallet</b> by clicking the "Connect Wallet" button.
            This will open your wallet, and let you confirm the connection, and also point your wallet to the
            Oasis Sapphire network. Ensure you have enough ROSE for any transaction fees.
          </div>
        ))}
      {remainingTimeString && <h4>{remainingTimeString}</h4>}
      {publishVotes && <div>Votes will be made public when the poll is closed.</div>}
      {isPastDue && (
        <h4>
          Voting results will be available when {isMine ? 'you close' : 'the owner formally closes'} the poll.
        </h4>
      )}
      {!getVerdict(canAclVote) && (
        <h4 className={'niceLine'}>
          <WarningCircleIcon size={'large'} />
          You can't vote on this poll, since {getReason(canAclVote)}.
        </h4>
      )}
      <div className={classes.buttons}>
        {hasWallet && getVerdict(canAclVote) && !isPastDue && (
          <div className={'niceLine'}>
            {gaslessPossible ? <NoGasRequiredIcon /> : <GasRequiredIcon />}
            <Button disabled={!canVote} onClick={vote} pending={isVoting}>
              {isVoting ? 'Submitting' : 'Submit vote'}
            </Button>
          </div>
        )}
        {isMine && (
          <Button
            disabled={!canClose}
            color={isMine && isPastDue ? 'primary' : 'secondary'}
            onClick={handleClose}
            pending={isClosing}
          >
            {isClosing ? 'Closing poll' : 'Close poll'}
          </Button>
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
      <SocialShares label={'Share poll on'} className="socialOnDark" />
    </Card>
  )
}
