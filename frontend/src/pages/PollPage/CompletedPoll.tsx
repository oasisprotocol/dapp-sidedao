import { FC } from 'react'
import { PollData } from './hook'
import classes from './index.module.css'
import { MyPollIcon } from '../../components/icons/MyPollIcon'
import { StringUtils } from '../../utils/string.utils'
import { Card } from '../../components/Card'
import { SocialShares } from '../../components/SocialShares'

export const CompletedPoll: FC<PollData> = ({ poll, pollResults, isMine }) => {
  const {
    name,
    // description,
    creator,
  } = poll!.ipfsParams!
  const { choices, votes } = pollResults!

  return (
    <Card>
      <h2>Results are in!</h2>
      <h4 className={'niceLine'}>
        {name}
        {isMine && <MyPollIcon creator={creator} />}
      </h4>
      {/*<h4>{description}</h4>*/}
      <>
        {Object.entries(choices).map(([index, entry]) => (
          <div
            className={StringUtils.clsx(
              classes.choice,
              classes.choiceWithResults,
              entry.winner ? classes.winner : '',
            )}
            key={`choice-${index}`}
          >
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
      <SocialShares label={'Share results on'} />
    </Card>
  )
}
