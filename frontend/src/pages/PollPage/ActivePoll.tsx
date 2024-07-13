import { FC, useCallback } from 'react';
import { Poll } from '../../types';
import classes from "./index.module.css"
import { Button } from '../../components/Button';

export const ActivePoll: FC<{
  poll: Poll
  selectedChoice: bigint | undefined,
  canSelect: boolean,
  setSelectedChoice: (choice: bigint | undefined) => void,
  canVote: boolean,
  vote: () => Promise<void>;
  isVoting: boolean,
  hasVoted: boolean,
  existingVote: bigint | undefined,
}> =
  ({
     poll: {name, description, choices},
     selectedChoice, canSelect, setSelectedChoice,
     canVote, vote, isVoting,
    hasVoted, existingVote,

   }) => {

    const handleSelect = useCallback((index: number) => {
      if (canSelect) {
        if (selectedChoice === BigInt(index)) {
          setSelectedChoice(undefined)
        } else {
          setSelectedChoice(BigInt(index))
        }
      // } else {
      //   console.log("Ignoring clicking, since we can't select.")
      }
    }, [canSelect, selectedChoice, setSelectedChoice])

    const handleSubmit = () => {
      console.log("Submitting")
      vote()
    }

    console.log("selected:", selectedChoice, "can select?", canSelect, "can Vote?", canVote, "voting?", isVoting, "hasVoted?", hasVoted, "existing vote", existingVote)
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
        <Button disabled={!canVote || isVoting} onClick={handleSubmit}>{isVoting ? "Submitting ..." : "Submit vote"}</Button>
      </div>
    )
  }

