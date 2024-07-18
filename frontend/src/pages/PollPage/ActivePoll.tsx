import { FC, useCallback } from 'react';
import classes from "./index.module.css"
import { Button } from '../../components/Button';
import { PollData } from './hook';
import { MyPollIcon } from '../../components/icons/MyPollIcon';
import { GasRequiredIcon } from '../../components/icons/GasRequiredIcon';
import { NoGasRequiredIcon } from '../../components/icons/NoGasRequiredIcon';
import { abbrAddr } from '../../utils/crypto.demo';
import { formatEther, parseEther } from 'ethers';
import { ConnectWallet } from '../../components/ConnectWallet';
import { Card } from '../../components/Card';
import { SocialShares } from '../../components/SocialShares';

export const ActivePoll: FC<PollData> = (
  {
    hasWallet,
    hasWalletOnWrongNetwork,
    poll,
    remainingTime,
    remainingTimeString,
    selectedChoice,
    canSelect,
    setSelectedChoice,
    canVote,
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
  }
) => {
  // console.log("hasWallet?", hasWallet, "hasWalletOnWrongNetwork?",hasWalletOnWrongNetwork)
  // console.log("isMine?", isMine, "canClose?", canClose)

  const {name, description, choices, creator } = poll!.ipfsParams

  const handleSelect = useCallback((index: number) => {
    if (canSelect) {
      if (selectedChoice === BigInt(index)) {
        setSelectedChoice(undefined)
      } else {
        setSelectedChoice(BigInt(index))
      }
    }
  }, [canSelect, selectedChoice, setSelectedChoice])

  const handleClose = useCallback(() => {
    if (canClose && window.confirm("Are you sure you want to close this poll? This can't be undone.")) {
      closePoll()
    }
  }, [close])

  const handleTopup = (address: string) => {
    const amountString = window.prompt(`Topup voting subsidy account:\n\n  ${address}\n\nAmount (in ROSE):`, '1');
    if (!amountString) return
    const amount = parseEther(amountString)
    if (amount > 0n) {
      console.log("Should topup", address, amount)
      void topUp(address, amount)
    }
  }

  const isPastDue = !!remainingTime?.isPastDue

  // console.log("selected:", selectedChoice, "can select?", canSelect, "can Vote?", canVote, "voting?", isVoting)
  return (
    <Card className={classes.darkCard}>
      <h2>
        {name}
        { isMine && <MyPollIcon creator={creator}/> }
      </h2>
      <h4>{description}</h4>

      { hasWallet && choices
        .map((choice, index)=> (
          <div
            key={`choice-${index}`}
            className={`${classes.choice} ${classes.darkChoice} ${canSelect ? classes.activeChoice : ""} ${selectedChoice?.toString() === index.toString() ? classes.selectedChoice : ""}`}
            onClick={()=>handleSelect(index)}
          >
            <div className={classes.above}>{choice}</div>
          </div>
        ))}
      { !hasWallet && (hasWalletOnWrongNetwork
        ? (
          <div className={classes.needWallet}>
            To vote on this poll, please <b>point your wallet to the Oasis network</b> by
            clicking the "Switch Network" button.
            This will open your wallet, and let you confirm that
            you want to connect to the Oasis Sapphire network.
            Ensure you have enough ROSE for any transaction fees.
          </div>
        ) : (
          <div className={classes.needWallet}>
            To vote on this poll, please <b>connect your wallet</b> by
            clicking the "Connect Wallet" button.
            This will open your wallet, and let you confirm the connection,
            and also point your wallet to the Oasis Sapphire network.
            Ensure you have enough ROSE for any transaction fees.
          </div>
      )) }
      { remainingTimeString && <h4>{remainingTimeString}</h4>}
      { isPastDue && <h4>Voting results will be available when {isMine ? "you close" : "the owner formally closes"} the poll.</h4>}
      <div className={classes.buttons}>
        { hasWallet && !isPastDue && (<div className={"niceLine"}>
            {gaslessPossible ? <NoGasRequiredIcon /> : <GasRequiredIcon /> }
            <Button
              disabled={!canVote}
              onClick={vote}
              pending={isVoting}
            >
              {isVoting
                ? "Submitting"
                : "Submit vote"
              }
            </Button>
          </div>
        ) }
        { isMine && (
          <Button disabled={!canClose} color={(isMine && isPastDue) ? "primary" : "secondary"} onClick={handleClose} pending={isClosing}>
            {isClosing ? "Closing poll" : "Close poll"}
          </Button>
        )}
        { !hasWallet && <ConnectWallet mobileSticky={false} />}
      </div>
      { isMine && gaslessPossible && (
        <div>
          <h4>Gasless voting enabled:</h4>
          <div>
            { gvAddresses.map((address,index)=> (
              <div key={`gvAddress-${index}`} className={"niceLine"}>
                { `${ abbrAddr(address) } (${ formatEther(gvBalances[index]) } ROSE)`}
                { !isPastDue && (<Button data-address={address} size={"small"} color={"secondary"} onClick={() => handleTopup(address)}>Topup</Button>) }
              </div>
            ))}
          </div>
        </div>
      )}
      <SocialShares label={"Share poll on"} className="socialOnDark"/>
    </Card>
  )
}
