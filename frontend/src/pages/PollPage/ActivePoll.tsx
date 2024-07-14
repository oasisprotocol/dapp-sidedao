import { FC, useCallback } from 'react';
import classes from "./index.module.css"
import { Button } from '../../components/Button';
import { PollData } from '../../hooks/usePollData';
import { MineIndicator } from './MineIndicator';
import { GasRequiredIcon } from '../../components/icons/GasRequiredIcon';
import { NoGasRequiredIcon } from '../../components/icons/NoGasRequiredIcon';
import { abbrAddr } from '../../utils/crypto.demo';
import { formatEther, parseEther } from 'ethers';

export const ActivePoll: FC<{ pollData: PollData }> = ({ pollData}) => {
  const {
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
    topUp
  } = pollData

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
    <div className={`${classes.card} ${classes.darkCard}`}>
      <h2>
        {name}
        { isMine && <MineIndicator creator={creator}/> }
      </h2>
      <h4>{description}</h4>
      <>
        { choices
          .map((choice, index)=> (
            <div
              key={`choice-${index}`}
              className={`${classes.choice} ${classes.darkChoice} ${canSelect ? classes.activeChoice : ""} ${selectedChoice?.toString() === index.toString() ? classes.selectedChoice : ""}`}
              onClick={()=>handleSelect(index)}
            >
              <div className={classes.above}>{choice}</div>
            </div>
          ))}
      </>
      { remainingTimeString && <h4>{remainingTimeString}</h4>}
      { isPastDue && <h4>Results will be available when {isMine ? "you close" : "the owner formally closes"} the poll.</h4>}
      <div className={classes.buttons}>
        { !isPastDue && (<div className={"niceLine"}>
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
      </div>
      { isMine && gaslessPossible && (
        <div>
          <h4>Gasless voting enabled:</h4>
          <div>
            { gvAddresses.map((address,index)=> (
              <div key={`gvAddress-${index}`} className={"niceLine"}>
                { `${ abbrAddr(address) } (${ formatEther(gvBalances[index]) } ROSE)`}
                <Button data-address={address} size={"small"} color={"secondary"} onClick={() => handleTopup(address)}>Topup</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
