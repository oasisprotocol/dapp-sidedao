import { FC, useCallback } from 'react';
import { Poll } from '../../types';
import classes from "./index.module.css"
import { Button } from '../../components/Button';
import { RemainingTime } from '../../hooks/usePollData';
import { MineIndicator } from './MineIndicator';
import { GasRequiredIcon } from '../../components/icons/GasRequiredIcon';
import { NoGasRequiredIcon } from '../../components/icons/NoGasRequiredIcon';

export const ActivePoll: FC<{
  poll: Poll
  remainingTime: RemainingTime | undefined
  remainingTimeString: string | undefined
  selectedChoice: bigint | undefined,
  canSelect: boolean,
  setSelectedChoice: (choice: bigint | undefined) => void,
  canVote: boolean,
  gaslessPossible: boolean,
  vote: () => Promise<void>;
  isVoting: boolean,
  isMine: boolean,
  canClose: boolean
  isClosing: boolean;
  closePoll: () => Promise<void>;
}> =
  ({
     poll,
     remainingTime, remainingTimeString,
     selectedChoice, canSelect, setSelectedChoice,
     canVote, gaslessPossible, vote, isVoting,
     isMine, canClose, isClosing, closePoll
   }) => {

    // console.log("isMine?", isMine, "canClose?", canClose)

    const {name, description, choices} = poll

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

    const isPastDue = !!remainingTime?.isPastDue

    // console.log("selected:", selectedChoice, "can select?", canSelect, "can Vote?", canVote, "voting?", isVoting)
    return (
      <div className={`${classes.card} ${classes.darkCard}`}>
        <h2>
          {name}
          { isMine && <MineIndicator creator={poll.creator}/> }
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
      </div>
    )
  }

