import { FC } from 'react'
import { PollData } from './hook'
import classes from './index.module.css'
import { MyPollIcon } from '../../components/icons/MyPollIcon'
import { StringUtils } from '../../utils/string.utils'
import { Card } from '../../components/Card'
import { SocialShares } from '../../components/SocialShares'
import { PollAccessIndicatorWrapper } from '../../components/PollCard/PollAccessIndicator'

export const CompletedPoll: FC<PollData> = ({
  poll,
  pollResults,
  isMine,
  aclExplanation,
  aclError,
  canAclVote,
}) => {
  const { name, description, creator } = poll!.ipfsParams!
  const { choices, votes } = pollResults!

  return (
    <Card>
      <h2>Results are in!</h2>
      <h4 className={'niceLine'}>
        <div className={'niceLine'}>
          {name}
          <PollAccessIndicatorWrapper
            aclExplanation={aclExplanation}
            isActive={false}
            canAclVote={canAclVote}
            aclError={aclError}
          />
          {isMine && <MyPollIcon creator={creator} />}
        </div>
      </h4>
      {!!description && <h4>{description}</h4>}
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
      <SocialShares label={'Share results on'} name={name} introText={'See the results here:'} />
    </Card>
  )
}
