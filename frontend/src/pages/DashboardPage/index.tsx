import { FC, useCallback } from 'react'
import { useDashboardData } from './useDashboardData'
import { Alert } from '../../components/Alert'
import { PollCard } from '../../components/PollCard'
import { Layout } from '../../components/Layout'
import classes from './index.module.css'
import { Button } from '../../components/Button'
import { useNavigate } from 'react-router-dom'
import { InputFieldGroup } from '../../components/InputFields'
import { ProofOfStakeIcon } from '../../components/icons/ProofOfStake'
import { motion } from 'framer-motion'

const NoPolls: FC<{ hasFilters: boolean; clearFilters: () => void }> = ({ hasFilters, clearFilters }) => {
  return (
    <motion.div
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
    </motion.div>
  )
}

export const DashboardPage: FC = () => {
  const navigate = useNavigate()
  const {
    isLoadingPolls,
    allProposals,
    reportVisibility,
    shouldShowInaccessiblePolls,
    leftFilterInputs,
    rightFilterInputs,
    searchPatterns,
    wantedStatus,
    myVisibleCount,
    otherVisibleCount,
    hasFilters,
    clearFilters,
  } = useDashboardData()
  const handleCreate = useCallback(() => navigate('/create'), [navigate])

  const createButton = (
    <Button className={classes.createButton} onClick={handleCreate}>
      Create New
    </Button>
  )

  return (
    <Layout variation="dashboard" extraWidget={createButton}>
      <div className={classes.dashboardMain}>
        <div className={classes.dashboardMyColumn}>
          <InputFieldGroup fields={[leftFilterInputs]} />
          <div className={classes.dashboardLabel}>My polls</div>
          {isLoadingPolls ? (
            <Alert headerText="Please wait" type="loading" actions={<span>Fetching polls...</span>} />
          ) : (
            <>
              {allProposals.map(proposal => (
                <PollCard
                  column={'mine'}
                  key={proposal.id}
                  proposal={proposal}
                  wantedStatus={wantedStatus}
                  showInaccessible={shouldShowInaccessiblePolls}
                  reportVisibility={reportVisibility}
                  searchPatterns={searchPatterns}
                />
              ))}
              {!myVisibleCount && <NoPolls hasFilters={hasFilters} clearFilters={clearFilters} />}
            </>
          )}
        </div>
        <div className={classes.dashboardOtherColumn}>
          <InputFieldGroup fields={[rightFilterInputs]} alignRight />
          <div className={classes.dashboardLabel}>Explore polls</div>
          {isLoadingPolls ? (
            <Alert headerText="Please wait" type="loading" actions={<span>Fetching polls...</span>} />
          ) : (
            <>
              {allProposals.map(proposal => (
                <PollCard
                  column={'others'}
                  key={proposal.id}
                  proposal={proposal}
                  wantedStatus={wantedStatus}
                  showInaccessible={shouldShowInaccessiblePolls}
                  searchPatterns={searchPatterns}
                  reportVisibility={reportVisibility}
                />
              ))}
              {!otherVisibleCount && <NoPolls hasFilters={hasFilters} clearFilters={clearFilters} />}
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
