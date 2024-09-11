import { FC, useCallback } from 'react'
import { useDashboardData } from './useDashboardData'
import { Alert } from '../../components/Alert'
import { PollCard } from '../../components/PollCard'
import { Layout } from '../../components/Layout'
import classes from './index.module.css'
import { Button } from '../../components/Button'
import { useNavigate } from 'react-router-dom'

export const DashboardPage: FC = () => {
  const navigate = useNavigate()
  const { myPolls, otherPolls, isLoadingPolls } = useDashboardData()

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
          <div className={classes.dashboardLabel}>My polls</div>
          {isLoadingPolls ? (
            <Alert headerText="Please wait" type="loading" actions={<span>Fetching polls...</span>} />
          ) : (
            myPolls.map(poll => <PollCard key={poll.id} poll={poll} />)
          )}
        </div>
        <div className={classes.dashboardOtherColumn}>
          <div className={classes.dashboardLabel}>Explore polls</div>
          {isLoadingPolls ? (
            <Alert headerText="Please wait" type="loading" actions={<span>Fetching polls...</span>} />
          ) : (
            otherPolls.map(poll => <PollCard key={poll.id} poll={poll} />)
          )}
        </div>
      </div>
    </Layout>
  )
}
