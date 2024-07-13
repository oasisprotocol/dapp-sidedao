import { FC } from 'react';
import { Poll } from '../../types';
import { PollResults } from '../../hooks/usePollData';
import classes from "./index.module.css"
import { MineIndicator } from './MineIndicator';

export const CompletedPoll: FC<{poll: Poll, results: PollResults, isMine: boolean}> =
  ({
     poll,
     results: {choices, votes},
     isMine,
   }) => {
    return (
      <div className={classes.card}>
        <h2>Results are in!</h2>
        <h3>
          {poll.name}
          {isMine && <MineIndicator creator={poll.creator}/>}
        </h3>
        <h4>{poll.description}</h4>
        <>
          {Object.entries(choices)
            .map(([index, entry]) => (
              <div className={`${classes.choice} ${entry.winner ? classes.winner : ''}`} key={`choice-${index}`}>
                <div className={classes.sizeBar} style={{ width: `${entry.rate}%` }} />
                <div className={classes.above}>{entry.choice}</div>
                <div className={`${classes.percentage} ${classes.above}`}>{entry.rate}%</div>
              </div>
            ))}
        </>
        {!!votes?.out_count && (
          <div>
            <h4>Individual votes:</h4>
            <>
              {votes.out_voters.map((voter, index) => {
                const [weight, choice] = votes.out_choices[index]
                return (
                  <div key={`voter-${index}`}>
                    {voter} ({weight.toString()}): {choices[choice.toString()].choice}
                  </div>
                )
              })}
            </>
          </div>

        )}
      </div>
    )
  }

