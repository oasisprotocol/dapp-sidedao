import { FC } from 'react'
import { PollData } from './hook'
import classes from './index.module.css'
import { StringUtils } from '../../utils/string.utils'
import { Card } from '../../components/Card'
import { SocialShares } from '../../components/SocialShares'
import { PollAccessIndicatorWrapper } from '../../components/PollCard/PollAccessIndicator'
import { getVerdict } from '../../components/InputFields'
import { motion } from 'framer-motion'

export const CompletedPoll: FC<
  Pick<PollData, 'poll' | 'pollResults' | 'isMine' | 'permissions' | 'checkPermissions'>
> = ({ poll, pollResults, isMine, permissions, checkPermissions }) => {
  const { name, description } = poll!.ipfsParams!
  const { choices, votes } = pollResults!
  const { explanation: aclExplanation, canVote: aclCanVote } = permissions

  return (
    <Card>
      <h2>Results are in!</h2>
      <h4 className={'niceLine'}>
        <div className={'niceLine'}>
          {name}
          <PollAccessIndicatorWrapper
            isMine={isMine}
            permissions={permissions}
            isActive={false}
            retest={checkPermissions}
            hideClosedNoAccess={true}
          />
        </div>
      </h4>
      {!!description && <h4>{description}</h4>}
      <>
        {Object.entries(choices).map(([index, entry]) => (
          <motion.div
            layout
            className={StringUtils.clsx(
              classes.choice,
              classes.choiceWithResults,
              entry.winner ? classes.winner : '',
            )}
            key={`choice-${index}`}
            initial={{
              height: 48,
              width: '100%',
            }}
            animate={{
              borderColor: ['#a2a0ffff', '#a2a0ff00', '#a2a0ffff'],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          >
            <motion.div
              layout
              className={classes.sizeBar}
              initial={{ width: '0%' }}
              animate={{ width: `${entry.rate}%` }}
              transition={{ delay: 0.5, duration: 0.5, ease: 'easeOut' }}
            />
            <div className={classes.above}>{entry.choice}</div>
            <motion.div
              className={`${classes.percentage} ${classes.above}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              {entry.rate}%
            </motion.div>
          </motion.div>
        ))}
      </>
      {aclExplanation && (
        <>
          <h4>{aclExplanation}</h4>
          {getVerdict(aclCanVote, false) ? <h4>You had access.</h4> : <h4>You didn't have access.</h4>}
        </>
      )}
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
