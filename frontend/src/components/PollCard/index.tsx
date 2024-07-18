import { FullProposal } from '../../types';
import { FC } from 'react';
import { micromark } from 'micromark';
import { Link } from 'react-router-dom';
import classes from "./index.module.css"
import { GasRequiredIcon } from '../icons/GasRequiredIcon';
import { NoGasRequiredIcon } from '../icons/NoGasRequiredIcon';
import { randomchoice } from '@oasisprotocol/side-dao-contracts';
import { HourGlassIcon } from '../icons/HourGlassIcon';
import { StringUtils } from '../../utils/string.utils';


const Arrow: FC<{className: string}> = ({className}) => (
  <svg width="20" height="15" viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M13 0.119751L11.59 1.52975L16.17 6.11975H0V8.11975H16.17L11.58 12.7098L13 14.1198L20 7.11975L13 0.119751Z"
          fill="#0500E1" />
  </svg>
)

const PollStatusIndicator: FC<{ active: boolean, isPastDue: boolean }> = ({ active, isPastDue }) => {
  return active
    ? <div
      className={StringUtils.clsx(classes.pollStatusActive, "niceLine")}
      title={ isPastDue ? "Voting has already finished." : "Voting is currently active."}
    >Active { isPastDue && <HourGlassIcon size={'small'}/>}
  </div>
    : <div className={classes.pollStatusCompleted} title={"Poll is closed, results are available."}>Completed</div>;
};

export const PollCard: FC<{
  poll: FullProposal
}> = ({ poll }) => {

  const {
    id: pollId,
    params: { name, description, options: { closeTimestamp} },
    proposal: { active }
  } = poll

  const gasLess = randomchoice([false, true]) // TODO: find this out by individually asking for this data
  const isPastDue = !!closeTimestamp && (new Date().getTime()/1000 > closeTimestamp)

  return (
    <Link to={`/polls/${pollId}`} style={{ textDecoration: "none" }}>
      <div className={classes.pollCard}>
        <div className={classes.pollCardTop}>
          <h4 className={active ? classes.activePollTitle : undefined}>{name}</h4>
          <Arrow className={active ? classes.activePollArrow : classes.passivePollArrow} />
        </div>
        <div dangerouslySetInnerHTML={{ __html: micromark(description) }} />
        <div className={classes.pollCardBottom}>
          <PollStatusIndicator active={active} isPastDue={isPastDue}/>
          {gasLess ? <NoGasRequiredIcon /> : <GasRequiredIcon />}
        </div>
      </div>
    </Link>
  )
}