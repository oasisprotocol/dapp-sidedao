import { FC, useCallback } from 'react'
import { useDashboardData } from './useDashboardData'
import { Alert } from '../../components/Alert'
import { PollCard } from '../../components/PollCard'
import { Layout } from '../../components/Layout'
import classes from './index.module.css'
import { Button } from '../../components/Button'
import { useNavigate } from 'react-router-dom'
import { InputFieldGroup } from '../../components/InputFields'

export const DashboardPage: FC = () => {
  const navigate = useNavigate()
  const {
    isLoadingPolls,
    typeFilteredProposals,
    reportVisibility,
    shouldShowInaccessiblePolls,
    leftFilterInputs,
    rightFilterInputs,
    searchPatterns,
    myVisibleCount,
    otherVisibleCount,
    // allVisibleCount,
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
              {typeFilteredProposals.map(proposal => (
                <PollCard
                  column={'mine'}
                  key={proposal.id}
                  proposal={proposal}
                  showInaccessible={shouldShowInaccessiblePolls}
                  reportVisibility={reportVisibility}
                  searchPatterns={searchPatterns}
                />
              ))}
              {!myVisibleCount && <span>No matching polls</span>}
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
              {typeFilteredProposals.map(proposal => (
                <PollCard
                  column={'others'}
                  key={proposal.id}
                  proposal={proposal}
                  showInaccessible={shouldShowInaccessiblePolls}
                  searchPatterns={searchPatterns}
                  reportVisibility={reportVisibility}
                />
              ))}
              {!otherVisibleCount && <span>No matching polls</span>}
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
