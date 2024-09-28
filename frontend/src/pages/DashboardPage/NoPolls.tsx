import { FC } from 'react'
import classes from './index.module.css'
import { ProofOfStakeIcon } from '../../components/icons/ProofOfStake'
import { MotionDiv } from '../../components/Animations'

export const NoPolls: FC<{ hasFilters: boolean; clearFilters: () => void }> = ({
  hasFilters,
  clearFilters,
}) => {
  return (
    <MotionDiv
      reason={'dashboardNoPolls'}
      className={classes.noPolls}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <ProofOfStakeIcon />
      <h4>No polls here</h4>
      {hasFilters && (
        <p>
          You might want to{' '}
          <a href="#" onClick={clearFilters}>
            clean your filters
          </a>{' '}
          to see more.
        </p>
      )}
    </MotionDiv>
  )
}
