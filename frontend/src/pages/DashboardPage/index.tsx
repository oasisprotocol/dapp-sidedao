import { FC, useCallback } from 'react'
import { useDashboardData } from './useDashboardData'
import { Alert } from '../../components/Alert'
import { PollCard } from '../../components/PollCard'
import { Layout } from '../../components/Layout'
import classes from './index.module.css'
import { Button } from '../../components/Button'
import { useNavigate } from 'react-router-dom'
import { CardContextProvider, useCardContext } from './CardContext'

const PollCards: FC = () => {
  const { state } = useCardContext()
  const { knownMine, knownOther } = state
  const { allProposals, isLoadingPolls } = useDashboardData()
  return (
    <>
      <div className={classes.dashboardMyColumn}>
        <div className={classes.dashboardLabel}>My polls</div>
        {isLoadingPolls ? (
          <Alert headerText="Please wait" type="loading" actions={<span>Fetching polls...</span>} />
        ) : (
          allProposals
            .filter(proposal => !knownOther.includes(proposal.id))
            .map(proposal => <PollCard key={proposal.id} proposal={proposal} />)
        )}
      </div>
      <div className={classes.dashboardOtherColumn}>
        <div className={classes.dashboardLabel}>Explore polls</div>
        {isLoadingPolls ? (
          <Alert headerText="Please wait" type="loading" actions={<span>Fetching polls...</span>} />
        ) : (
          allProposals
            .filter(proposal => !knownMine.includes(proposal.id))
            .map(proposal => <PollCard key={proposal.id} proposal={proposal} />)
        )}
      </div>
    </>
  )
}

export const DashboardPage: FC = () => {
  const navigate = useNavigate()

  const handleCreate = useCallback(() => navigate('/create'), [navigate])

  const createButton = (
    <Button className={classes.createButton} onClick={handleCreate}>
      Create New
    </Button>
  )

  return (
    <Layout variation="dashboard" extraWidget={createButton}>
      <div className={classes.dashboardMain}>
        <CardContextProvider>
          <PollCards />
        </CardContextProvider>
      </div>
    </Layout>
  )
}
