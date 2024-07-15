import { FullProposal } from '../../types/poll';
import { FC } from 'react';
import { micromark } from 'micromark';
import { CaretRightIcon } from '../icons/CaretRightIcon';
import { useAppState } from '../../hooks/useAppState';
import { Link } from 'react-router-dom';
import classes from "./index.module.css"
import { GasRequiredIcon } from '../icons/GasRequiredIcon';
import { NoGasRequiredIcon } from '../icons/NoGasRequiredIcon';
import { randomchoice } from '@oasisprotocol/side-dao-contracts';

const PollStatusIndicator: FC<{active: boolean}> = ({active}) => {
  return active
    ? <span className={classes.pollStatusActive}>Active</span>
    : <span className={classes.pollStatusCompleted}>Completed</span>
}

export const PollCard: FC<{
  poll: FullProposal
}> = ({ poll }) => {
  const { state: { isDesktopScreen } } = useAppState()

  const {
    id: pollId,
    params: { name, description },
    proposal: { active }
  } = poll

  const gasLess = randomchoice([false, true]) // TODO: find this out by individually asking for this data

  // console.log("Poll:", poll, "gasLess:", gasLess)

  return (
    <Link to={`/polls/${pollId}`} style={{ textDecoration: "none" }}>
      <div className={classes.pollCard}>
        <div className={classes.pollCardTop}>
          <h4 className={active ? classes.activePollTitle : undefined}>{name}</h4>
          <div className={active ? classes.activePollArrow : classes.passivePollArrow}>
            <CaretRightIcon size={isDesktopScreen ? 'medium' : 'small'} />
          </div>


        </div>
        <div dangerouslySetInnerHTML={{ __html: micromark(description) }} />
        <div className={classes.pollCardBottom}>
          <PollStatusIndicator active={active} />
          {gasLess ? <NoGasRequiredIcon /> : <GasRequiredIcon />}
        </div>



      </div>
    </Link>
  )
}