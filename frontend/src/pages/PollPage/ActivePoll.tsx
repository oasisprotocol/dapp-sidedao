import { FC, useCallback } from 'react';
import { Poll } from '../../types';
import classes from "./index.module.css"
import { Button } from '../../components/Button';
import { RemainingTime } from '../../hooks/usePollData';

export const ActivePoll: FC<{
  poll: Poll
  remainingTime: RemainingTime | undefined
  remainingTimeString: string | undefined
  selectedChoice: bigint | undefined,
  canSelect: boolean,
  setSelectedChoice: (choice: bigint | undefined) => void,
  canVote: boolean,
  vote: () => Promise<void>;
  isVoting: boolean,

}> =
  ({
     poll: {name, description, choices},
     remainingTime, remainingTimeString,
     selectedChoice, canSelect, setSelectedChoice,
     canVote, vote, isVoting,
   }) => {

    const handleSelect = useCallback((index: number) => {
      if (canSelect) {
        if (selectedChoice === BigInt(index)) {
          setSelectedChoice(undefined)
        } else {
          setSelectedChoice(BigInt(index))
        }
      }
    }, [canSelect, selectedChoice, setSelectedChoice])

    const handleSubmit = () => {
      vote()
    }

    const pastDue = !!remainingTime?.pastDue

    // console.log("selected:", selectedChoice, "can select?", canSelect, "can Vote?", canVote, "voting?", isVoting)
    return (
      <div className={`${classes.card} ${classes.darkCard}`}>
        <h2>{name}</h2>
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
        { !pastDue && <Button disabled={!canVote || isVoting} onClick={handleSubmit}>{isVoting ? "Submitting ..." : "Submit vote"}</Button> }
        { remainingTimeString && <h4>{remainingTimeString}</h4>}
        { pastDue && <h4>Results will be available when the owner formally closes the vote.</h4>}
      </div>
    )
  }

